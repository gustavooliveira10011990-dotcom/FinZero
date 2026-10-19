// Supabase Edge Function: distribute-lead
// Concurrency-safe round-robin distribution with idempotency
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configuração do Supabase incompleta no servidor' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json().catch(() => ({}));
    const { attempt_id, source } = body;

    if (!attempt_id || typeof attempt_id !== 'string') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Identificador de tentativa (attempt_id) é obrigatório para idempotência' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call stored procedure with row-lock and transaction
    const { data, error } = await supabase.rpc('distribute_next_attendant', {
      p_attempt_id: attempt_id,
      p_source: source || 'modal_proposta',
    });

    if (error) {
      console.error('Erro na RPC distribute_next_attendant:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Falha ao processar distribuição no banco de dados',
          details: error.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result || !result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result?.message || 'Nenhum atendente ativo disponível no momento',
          code: 'NO_ACTIVE_ATTENDANTS',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        attendant: {
          id: result.attendant_id,
          name: result.attendant_name,
          phone: result.attendant_phone,
        },
        is_idempotent_replay: result.is_idempotent_replay || false,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Exceção em distribute-lead:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Erro interno no servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
