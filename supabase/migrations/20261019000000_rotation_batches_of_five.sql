BEGIN;
ALTER TABLE public.rotation_state ADD COLUMN IF NOT EXISTS batch_count integer NOT NULL DEFAULT 0 CHECK (batch_count BETWEEN 0 AND 5);
CREATE OR REPLACE FUNCTION public.distribute_next_attendant(p_attempt_id text, p_source text DEFAULT 'modal_proposta')
RETURNS TABLE(success boolean, attendant_id uuid, attendant_name text, attendant_phone text, is_idempotent_replay boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_existing public.lead_dispatches%ROWTYPE;
  v_last_id uuid;
  v_batch_count integer;
  v_chosen public.attendants%ROWTYPE;
BEGIN
  IF p_attempt_id IS NULL OR btrim(p_attempt_id) = '' THEN RAISE EXCEPTION 'Identificador de tentativa obrigatório'; END IF;
  INSERT INTO public.rotation_state(id) VALUES(1) ON CONFLICT(id) DO NOTHING;
  SELECT rs.last_attendant_id, rs.batch_count INTO v_last_id, v_batch_count FROM public.rotation_state rs WHERE rs.id = 1 FOR UPDATE;
  SELECT ld.* INTO v_existing FROM public.lead_dispatches ld WHERE ld.attempt_id = p_attempt_id;
  IF FOUND THEN
    RETURN QUERY SELECT true, v_existing.attendant_id, v_existing.attendant_name, v_existing.attendant_phone, true, 'Encaminhamento recuperado por idempotência'::text;
    RETURN;
  END IF;
  IF v_last_id IS NOT NULL AND v_batch_count < 5 THEN
    SELECT a.* INTO v_chosen FROM public.attendants a WHERE a.id = v_last_id AND a.is_active AND NOT a.is_deleted;
    IF FOUND THEN v_batch_count := v_batch_count + 1; END IF;
  END IF;
  IF v_chosen.id IS NULL THEN
    SELECT a.* INTO v_chosen FROM public.attendants a JOIN public.attendants previous ON previous.id = v_last_id
      WHERE a.is_active AND NOT a.is_deleted AND (a.display_order, a.created_at, a.id) > (previous.display_order, previous.created_at, previous.id)
      ORDER BY a.display_order, a.created_at, a.id LIMIT 1;
    IF v_chosen.id IS NULL THEN
      SELECT a.* INTO v_chosen FROM public.attendants a WHERE a.is_active AND NOT a.is_deleted ORDER BY a.display_order, a.created_at, a.id LIMIT 1;
    END IF;
    v_batch_count := 1;
  END IF;
  IF v_chosen.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, false, 'Nenhum atendente ativo configurado no momento'::text;
    RETURN;
  END IF;
  INSERT INTO public.lead_dispatches(attempt_id, attendant_id, attendant_name, attendant_phone, source)
    VALUES(p_attempt_id, v_chosen.id, v_chosen.name, v_chosen.phone, COALESCE(p_source, 'modal_proposta'));
  UPDATE public.rotation_state SET last_attendant_id = v_chosen.id, batch_count = v_batch_count, updated_at = now() WHERE id = 1;
  RETURN QUERY SELECT true, v_chosen.id, v_chosen.name, v_chosen.phone, false, 'Atendente atribuído com sucesso'::text;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.distribute_next_attendant(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.distribute_next_attendant(text,text) TO service_role;

COMMIT;
