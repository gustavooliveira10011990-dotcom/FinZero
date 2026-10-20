-- Executar depois da migração. Todos os dados de teste são desfeitos.

BEGIN;
DO $$
DECLARE
 v_ids uuid[] := ARRAY[gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
 v_prefix text := 'validation-' || gen_random_uuid()::text || '-';
 v_result record; v_expected uuid; v_metrics jsonb; v_item jsonb; v_before bigint; v_i integer;
BEGIN
 PERFORM 1 FROM public.rotation_state WHERE id=1 FOR UPDATE;
 SELECT count(*) INTO v_before FROM public.lead_dispatches;
 UPDATE public.attendants SET is_active=false;
 FOR v_i IN 1..3 LOOP
   INSERT INTO public.attendants(id,name,phone,display_order) VALUES(v_ids[v_i],'Validation ' || v_i,'5511000000000',v_i);
 END LOOP;
 UPDATE public.rotation_state SET last_attendant_id=NULL,batch_count=0 WHERE id=1;
 FOR v_i IN 1..31 LOOP
   v_expected := v_ids[(((v_i-1)/5)%3)+1];
   SELECT * INTO v_result FROM public.distribute_next_attendant(v_prefix || v_i,'internal_validation');
   IF NOT v_result.success OR v_result.attendant_id IS DISTINCT FROM v_expected THEN RAISE EXCEPTION 'Falha no bloco de cinco: tentativa %',v_i; END IF;
   SELECT * INTO v_result FROM public.distribute_next_attendant(v_prefix || v_i,'internal_validation');
   IF NOT v_result.is_idempotent_replay OR v_result.attendant_id IS DISTINCT FROM v_expected THEN RAISE EXCEPTION 'Falha na idempotência: tentativa %',v_i; END IF;
 END LOOP;
 UPDATE public.attendants SET is_active=false WHERE id=v_ids[1];
 SELECT * INTO v_result FROM public.distribute_next_attendant(v_prefix || 'paused','internal_validation');
 IF v_result.attendant_id IS DISTINCT FROM v_ids[2] THEN RAISE EXCEPTION 'Não pulou atendente pausado'; END IF;
 UPDATE public.attendants SET is_deleted=true WHERE id=v_ids[2];
 SELECT * INTO v_result FROM public.distribute_next_attendant(v_prefix || 'deleted','internal_validation');
 IF v_result.attendant_id IS DISTINCT FROM v_ids[3] THEN RAISE EXCEPTION 'Não pulou atendente excluído'; END IF;
 UPDATE public.attendants SET is_active=false WHERE id=v_ids[3];
 SELECT * INTO v_result FROM public.distribute_next_attendant(v_prefix || 'empty','internal_validation');
 IF v_result.success THEN RAISE EXCEPTION 'Distribuiu sem atendentes ativos'; END IF;
 IF (SELECT count(*) FROM public.lead_dispatches) <> v_before+33 THEN RAISE EXCEPTION 'Cliques repetidos ou falhas alteraram a contagem'; END IF;
 SELECT public.get_rotation_metrics() INTO v_metrics;
 IF v_metrics->>'timezone' <> 'America/Sao_Paulo' OR (v_metrics->>'current_date_sp')::date <> (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'Fuso ou data das métricas incorretos'; END IF;
 FOR v_i IN 1..3 LOOP
   SELECT value INTO v_item FROM jsonb_array_elements(v_metrics->'attendants') WHERE (value->>'id')::uuid=v_ids[v_i];
   IF v_item IS NULL OR (v_item->>'dispatches_today')::integer <> 11 OR (v_item->>'dispatches_total')::integer <> 11 THEN RAISE EXCEPTION 'Contagem diária por atendente incorreta'; END IF;
 END LOOP;
END;
$$;
ROLLBACK;
SELECT 'PASS: blocos de 5, volta da fila, idempotência, pausas, exclusão e métricas diárias; dados de teste desfeitos.' AS resultado;
