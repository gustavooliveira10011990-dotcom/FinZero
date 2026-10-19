// Supabase Edge Function: admin-attendants
// CRUD management for WhatsApp attendants with soft-delete and active toggling
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

async function sha256Hex(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function validateSession(supabase: any, req: Request): Promise<boolean> {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return false;

  const tokenHash = await sha256Hex(token);
  const nowIso = new Date().toISOString();

  const { data: session } = await supabase
    .from('admin_sessions')
    .select('id')
    .eq('token_hash', tokenHash)
    .gt('expires_at', nowIso)
    .maybeSingle();

  return Boolean(session);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração do Supabase incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify session
    const isAuthed = await validateSession(supabase, req);
    if (!isAuthed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sessão inválida ou expirada. Faça login novamente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || (req.method === 'GET' ? 'list' : '');

    // 1. LIST ALL ATTENDANTS
    if (action === 'list') {
      const { data, error } = await supabase
        .from('attendants')
        .select('*')
        .order('is_deleted', { ascending: true })
        .order('is_active', { ascending: false })
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, attendants: data || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. CREATE ATTENDANT
    if (action === 'create') {
      const { name, phone, display_order } = body;

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return new Response(
          JSON.stringify({ success: false, error: 'Nome do atendente é obrigatório (mínimo 2 caracteres)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Format validation: ONLY digits, international e.g. 5511970810467 (10 to 15 digits)
      const cleanPhone = (phone || '').toString().replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 15) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Número de WhatsApp inválido. Digite apenas números no formato internacional (ex: 5511970810467, de 10 a 15 dígitos).' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('attendants')
        .insert({
          name: name.trim(),
          phone: cleanPhone,
          display_order: Number.isInteger(display_order) ? display_order : 0,
          is_active: true,
          is_deleted: false,
        })
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, attendant: data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. UPDATE ATTENDANT
    if (action === 'update') {
      const { id, name, phone, display_order } = body;

      if (!id) {
        return new Response(
          JSON.stringify({ success: false, error: 'ID do atendente é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      if (name && typeof name === 'string' && name.trim().length >= 2) {
        updateData.name = name.trim();
      }
      if (phone) {
        const cleanPhone = phone.toString().replace(/\D/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 15) {
          return new Response(
            JSON.stringify({ success: false, error: 'WhatsApp inválido. Apenas dígitos (10 a 15 dígitos, ex: 5511970810467).' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        updateData.phone = cleanPhone;
      }
      if (Number.isInteger(display_order)) {
        updateData.display_order = display_order;
      }

      const { data, error } = await supabase
        .from('attendants')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, attendant: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. TOGGLE ACTIVE (PAUSE / UNPAUSE)
    if (action === 'toggle_active') {
      const { id, is_active } = body;

      if (!id || typeof is_active !== 'boolean') {
        return new Response(
          JSON.stringify({ success: false, error: 'Parâmetros id e is_active (boolean) são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('attendants')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, attendant: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. SOFT DELETE (EXCLUSÃO LÓGICA MANTENDO HISTÓRICO DE ENCAMINHAMENTOS)
    if (action === 'soft_delete') {
      const { id } = body;

      if (!id) {
        return new Response(
          JSON.stringify({ success: false, error: 'ID do atendente é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('attendants')
        .update({ 
          is_deleted: true, 
          is_active: false, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, attendant: data, message: 'Atendente desativado e excluído logicamente com histórico preservado' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Ação não reconhecida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Erro em admin-attendants:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Erro interno no servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
