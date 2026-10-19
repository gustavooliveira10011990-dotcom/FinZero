-- ============================================================================
-- FINZERO - SISTEMA DE DISTRIBUIÇÃO E RODÍZIO WHATSAPP (SUPABASE MIGRATION)
-- ============================================================================

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELA DE ATENDENTES
CREATE TABLE IF NOT EXISTS public.attendants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL CHECK (phone ~ '^[0-9]{10,15}$'), -- Apenas dígitos no formato internacional (ex: 5511970810467)
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comentários para documentação
COMMENT ON TABLE public.attendants IS 'Atendentes cadastrados para o rodízio do WhatsApp';
COMMENT ON COLUMN public.attendants.phone IS 'Número internacional apenas com dígitos (ex: 5511970810467)';
COMMENT ON COLUMN public.attendants.is_deleted IS 'Exclusão lógica para preservar histórico de encaminhamentos';

-- 2. TABELA DO ESTADO DO RODÍZIO (CURSOR PERSISTENTE)
CREATE TABLE IF NOT EXISTS public.rotation_state (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    last_attendant_id UUID REFERENCES public.attendants(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inicializar linha única de estado
INSERT INTO public.rotation_state (id, last_attendant_id, updated_at)
VALUES (1, NULL, now())
ON CONFLICT (id) DO NOTHING;

-- 3. TABELA DE ENCAMINHAMENTOS (HISTÓRICO MÍNIMO SEM DADOS SENSÍVEIS)
-- Em conformidade estrita com LGPD: NÃO armazena CPF, data de nascimento, renda ou empréstimo.
CREATE TABLE IF NOT EXISTS public.lead_dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id TEXT NOT NULL UNIQUE, -- Chave de idempotência enviada pelo cliente (previne duplo clique)
    attendant_id UUID NOT NULL REFERENCES public.attendants(id),
    attendant_name TEXT NOT NULL,
    attendant_phone TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'modal_proposta',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.lead_dispatches IS 'Histórico de encaminhamentos para atendimento WhatsApp';
COMMENT ON COLUMN public.lead_dispatches.attempt_id IS 'UUID de tentativa única gerada no cliente (idempotência)';

-- Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_dispatches_created_attendant ON public.lead_dispatches (created_at DESC, attendant_id);
CREATE INDEX IF NOT EXISTS idx_attendants_active_order ON public.attendants (is_deleted, is_active, display_order, created_at);

-- 4. TABELA DE SESSÕES DE ADMINISTRADOR
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON public.admin_sessions (token_hash, expires_at);

-- 5. TABELA DE TENTATIVAS DE LOGIN (RATE LIMITING)
CREATE TABLE IF NOT EXISTS public.admin_auth_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    attempt_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    success BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip_time ON public.admin_auth_attempts (ip_address, attempt_time DESC);

-- ============================================================================
-- SEGURANÇA E RLS (ROW LEVEL SECURITY)
-- ============================================================================
ALTER TABLE public.attendants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_auth_attempts ENABLE ROW LEVEL SECURITY;

-- Por padrão, NENHUMA tabela é acessível pela chave 'anon' pública.
-- Apenas chamadas via Edge Functions autenticadas usando 'service_role' possuem acesso aos dados.

-- ============================================================================
-- FUNÇÃO ATÔMICA DE RODÍZIO CONCORRENTE COM TRAVA SQL E IDEMPOTÊNCIA
-- ============================================================================
CREATE OR REPLACE FUNCTION public.distribute_next_attendant(
    p_attempt_id TEXT,
    p_source TEXT DEFAULT 'modal_proposta'
)
RETURNS TABLE (
    success BOOLEAN,
    attendant_id UUID,
    attendant_name TEXT,
    attendant_phone TEXT,
    is_idempotent_replay BOOLEAN,
    message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing_dispatch RECORD;
    v_last_id UUID;
    v_chosen_attendant public.attendants%ROWTYPE;
    v_first_attendant RECORD;
    v_found BOOLEAN := false;
    v_record public.attendants%ROWTYPE;
BEGIN
    -- Serializar antes de conferir idempotência, inclusive tentativas simultâneas iguais.
    PERFORM 1 FROM public.rotation_state WHERE id = 1 FOR UPDATE;
    -- 1. CHECAGEM DE IDEMPOTÊNCIA:
    -- Se a mesma tentativa (duplo clique ou retry da mesma submissão) já existir, retorna o mesmo atendente sem avançar a fila.
    SELECT 
        ld.attendant_id,
        ld.attendant_name,
        ld.attendant_phone
    INTO v_existing_dispatch
    FROM public.lead_dispatches ld
    WHERE ld.attempt_id = p_attempt_id
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT 
            true,
            v_existing_dispatch.attendant_id,
            v_existing_dispatch.attendant_name,
            v_existing_dispatch.attendant_phone,
            true, -- Repetição idempotente
            'Encaminhamento recuperado por idempotência'::TEXT;
        RETURN;
    END IF;

    -- 2. TRAVA DE CONCORRÊNCIA NA LINHA DO ESTADO DE RODÍZIO:
    -- Bloqueia a linha id=1 para esta transação até o commit, impedindo condições de corrida simultâneas
    SELECT rs.last_attendant_id 
    INTO v_last_id
    FROM public.rotation_state rs
    WHERE rs.id = 1
    FOR UPDATE;

    -- Se não encontrar a linha de estado, cria
    IF NOT FOUND THEN
        INSERT INTO public.rotation_state (id, last_attendant_id, updated_at)
        VALUES (1, NULL, now());
        v_last_id := NULL;
    END IF;

    -- 3. SELEÇÃO DO PRÓXIMO ATENDENTE ATIVO E NÃO EXCLUÍDO:
    -- Ordenados de forma determinística por display_order, created_at, id
    -- Se last_attendant_id foi o último da lista ou foi desativado/excluído, o rodízio volta ao primeiro.
    
    -- Obter o primeiro da fila caso precise reiniciar o ciclo
    SELECT a.*
    INTO v_first_attendant
    FROM public.attendants a
    WHERE a.is_active = true 
      AND a.is_deleted = false
    ORDER BY a.display_order ASC, a.created_at ASC, a.id ASC
    LIMIT 1;

    -- Se não houver nenhum atendente ativo, retorna aviso seguro sem redirecionar
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            false,
            NULL::UUID,
            NULL::TEXT,
            NULL::TEXT,
            false,
            'Nenhum atendente ativo configurado no momento'::TEXT;
        RETURN;
    END IF;

    -- Se temos um last_attendant_id, buscar o próximo na fila após ele
    IF v_last_id IS NOT NULL THEN
        -- Buscar atendentes ativos posicionados após o último atendente
        SELECT a.* INTO v_chosen_attendant
        FROM public.attendants a
        JOIN public.attendants previous ON previous.id = v_last_id
        WHERE a.is_active AND NOT a.is_deleted
          AND (a.display_order, a.created_at, a.id) >
              (previous.display_order, previous.created_at, previous.id)
        ORDER BY a.display_order, a.created_at, a.id
        LIMIT 1;
    END IF;

    -- Se não encontrou um próximo após o último (ou era o último da fila, ou last_id era nulo/desativado):
    IF v_chosen_attendant.id IS NULL THEN
        v_chosen_attendant := v_first_attendant;
    END IF;

    -- 4. ATUALIZAR ESTADO DO RODÍZIO:
    UPDATE public.rotation_state
    SET last_attendant_id = v_chosen_attendant.id,
        updated_at = now()
    WHERE id = 1;

    -- 5. REGISTRAR O ENCAMINHAMENTO (COM CHAVE DE IDEMPOTÊNCIA):
    INSERT INTO public.lead_dispatches (
        attempt_id,
        attendant_id,
        attendant_name,
        attendant_phone,
        source
    ) VALUES (
        p_attempt_id,
        v_chosen_attendant.id,
        v_chosen_attendant.name,
        v_chosen_attendant.phone,
        COALESCE(p_source, 'modal_proposta')
    );

    -- 6. RETORNAR SUCESSO E DADOS DO ATENDENTE:
    RETURN QUERY SELECT 
        true,
        v_chosen_attendant.id,
        v_chosen_attendant.name,
        v_chosen_attendant.phone,
        false, -- Novo encaminhamento
        'Atendente atribuído com sucesso'::TEXT;
END;
$$;

-- Restringir a função para service_role
REVOKE EXECUTE ON FUNCTION public.distribute_next_attendant(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.distribute_next_attendant(TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.distribute_next_attendant(TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.distribute_next_attendant(TEXT, TEXT) TO service_role;

-- ============================================================================
-- FUNÇÃO DE MÉTRICAS EM AMERICA/SAO_PAULO
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_rotation_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_today_start TIMESTAMPTZ;
    v_7d_start TIMESTAMPTZ;
    v_15d_start TIMESTAMPTZ;
    v_30d_start TIMESTAMPTZ;
    v_now_sp TIMESTAMP;
    v_today_date DATE;
    v_total_today BIGINT;
    v_total_7d BIGINT;
    v_total_15d BIGINT;
    v_total_30d BIGINT;
    v_total_all BIGINT;
    v_attendants_metrics JSONB;
BEGIN
    -- Obter data e hora atual no fuso America/Sao_Paulo
    v_now_sp := timezone('America/Sao_Paulo', now());
    v_today_date := v_now_sp::date;

    -- Inícios de intervalo inclusivos de dias de calendário no fuso de São Paulo
    v_today_start := (v_today_date::TEXT || ' 00:00:00 America/Sao_Paulo')::TIMESTAMPTZ;
    v_7d_start    := (v_today_date - 6)::timestamp AT TIME ZONE 'America/Sao_Paulo';
    v_15d_start   := (v_today_date - 14)::timestamp AT TIME ZONE 'America/Sao_Paulo';
    v_30d_start   := (v_today_date - 29)::timestamp AT TIME ZONE 'America/Sao_Paulo';

    -- Totais gerais
    SELECT COUNT(*) INTO v_total_today FROM public.lead_dispatches WHERE created_at >= v_today_start;
    SELECT COUNT(*) INTO v_total_7d    FROM public.lead_dispatches WHERE created_at >= v_7d_start;
    SELECT COUNT(*) INTO v_total_15d   FROM public.lead_dispatches WHERE created_at >= v_15d_start;
    SELECT COUNT(*) INTO v_total_30d   FROM public.lead_dispatches WHERE created_at >= v_30d_start;
    SELECT COUNT(*) INTO v_total_all   FROM public.lead_dispatches;

    -- Métricas por atendente (inclui soft-deleted para preservar o histórico)
    SELECT jsonb_agg(row_to_json(m))
    INTO v_attendants_metrics
    FROM (
        SELECT 
            a.id,
            a.name,
            a.phone,
            a.is_active,
            a.is_deleted,
            a.display_order,
            a.created_at,
            COUNT(ld.id) FILTER (WHERE ld.created_at >= v_today_start) AS dispatches_today,
            COUNT(ld.id) FILTER (WHERE ld.created_at >= v_7d_start) AS dispatches_7d,
            COUNT(ld.id) FILTER (WHERE ld.created_at >= v_15d_start) AS dispatches_15d,
            COUNT(ld.id) FILTER (WHERE ld.created_at >= v_30d_start) AS dispatches_30d,
            COUNT(ld.id) AS dispatches_total
        FROM public.attendants a
        LEFT JOIN public.lead_dispatches ld ON ld.attendant_id = a.id
        GROUP BY a.id
        ORDER BY a.is_deleted ASC, a.is_active DESC, a.display_order ASC, a.name ASC
    ) m;

    RETURN jsonb_build_object(
        'timezone', 'America/Sao_Paulo',
        'current_date_sp', v_today_date::TEXT,
        'current_timestamp_sp', v_now_sp::TEXT,
        'intervals', jsonb_build_object(
            'today', jsonb_build_object('label', 'Hoje', 'start', v_today_start),
            '7d', jsonb_build_object('label', 'Últimos 7 dias', 'start', v_7d_start),
            '15d', jsonb_build_object('label', 'Últimos 15 dias', 'start', v_15d_start),
            '30d', jsonb_build_object('label', 'Últimos 30 dias', 'start', v_30d_start)
        ),
        'totals', jsonb_build_object(
            'today', COALESCE(v_total_today, 0),
            'last_7_days', COALESCE(v_total_7d, 0),
            'last_15_days', COALESCE(v_total_15d, 0),
            'last_30_days', COALESCE(v_total_30d, 0),
            'all_time', COALESCE(v_total_all, 0)
        ),
        'attendants', COALESCE(v_attendants_metrics, '[]'::JSONB)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_rotation_metrics() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_rotation_metrics() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_rotation_metrics() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_rotation_metrics() TO service_role;

REVOKE ALL ON TABLE public.attendants, public.rotation_state, public.lead_dispatches,
public.admin_sessions, public.admin_auth_attempts FROM anon, authenticated;
GRANT ALL ON TABLE public.attendants, public.rotation_state, public.lead_dispatches,
public.admin_sessions, public.admin_auth_attempts TO service_role;
