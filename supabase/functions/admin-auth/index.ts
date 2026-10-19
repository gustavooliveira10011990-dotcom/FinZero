// Supabase Edge Function: admin-auth
// Password-only authentication with server-side validation, rate-limiting, and sessions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function sha256Hex(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Constant-time string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const configuredAdminPassword = Deno.env.get('ADMIN_PASSWORD') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração do Supabase incompleta no servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown_ip';

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'login';

    // 1. ACTION: LOGIN
    if (action === 'login') {
      const { password } = body;

      if (!configuredAdminPassword) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'O segredo ADMIN_PASSWORD ainda não foi configurado no Supabase Edge Functions. Configure usando: supabase secrets set ADMIN_PASSWORD="sua-senha"' 
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check rate-limiting: max 5 failed attempts in last 15 minutes
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count: failedAttempts } = await supabase
        .from('admin_auth_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', clientIp)
        .eq('success', false)
        .gte('attempt_time', fifteenMinutesAgo);

      if ((failedAttempts ?? 0) >= 5) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Muitas tentativas incorretas. Por segurança, aguarde 15 minutos para tentar novamente.' 
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!password || typeof password !== 'string') {
        return new Response(
          JSON.stringify({ success: false, error: 'Senha não fornecida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isValidPassword = timingSafeEqual(password, configuredAdminPassword);

      // Record attempt
      await supabase.from('admin_auth_attempts').insert({
        ip_address: clientIp,
        success: isValidPassword,
      });

      if (!isValidPassword) {
        const remaining = 5 - ((failedAttempts ?? 0) + 1);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: remaining > 0 
              ? `Senha incorreta. ${remaining} tentativa(s) restante(s).` 
              : 'Senha incorreta. Limite de tentativas atingido. Bloqueado por 15 minutos.'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate random secure session token
      const rawTokenArray = new Uint8Array(32);
      crypto.getRandomValues(rawTokenArray);
      const token = Array.from(rawTokenArray).map((b) => b.toString(16).padStart(2, '0')).join('');
      const tokenHash = await sha256Hex(token);

      // Session expires in 8 hours
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

      const { error: sessionError } = await supabase.from('admin_sessions').insert({
        token_hash: tokenHash,
        expires_at: expiresAt,
        ip_address: clientIp,
      });

      if (sessionError) {
        console.error('Erro ao salvar sessão admin:', sessionError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao inicializar sessão de administrador' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          token,
          expires_at: expiresAt,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. ACTION: VERIFY SESSION
    if (action === 'verify') {
      const authHeader = req.headers.get('authorization') || '';
      const token = authHeader.replace('Bearer ', '').trim();

      if (!token) {
        return new Response(
          JSON.stringify({ success: false, authenticated: false, error: 'Token não fornecido' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenHash = await sha256Hex(token);
      const nowIso = new Date().toISOString();

      const { data: session, error } = await supabase
        .from('admin_sessions')
        .select('id, expires_at')
        .eq('token_hash', tokenHash)
        .gt('expires_at', nowIso)
        .maybeSingle();

      if (error || !session) {
        return new Response(
          JSON.stringify({ success: true, authenticated: false, error: 'Sessão expirada ou inválida' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, authenticated: true, expires_at: session.expires_at }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. ACTION: LOGOUT
    if (action === 'logout') {
      const authHeader = req.headers.get('authorization') || '';
      const token = authHeader.replace('Bearer ', '').trim();

      if (token) {
        const tokenHash = await sha256Hex(token);
        await supabase.from('admin_sessions').delete().eq('token_hash', tokenHash);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Sessão encerrada com sucesso' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Ação não suportada' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Erro em admin-auth:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Erro interno no servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
