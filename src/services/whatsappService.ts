/**
 * Serviço de Gerenciamento e Distribuição de Atendentes WhatsApp
 * Suporta Supabase Edge Functions reais com tratamento explícito de erros,
 * Configuração ausente gera erro explícito, sem dados simulados.
 */

export interface Attendant {
  id: string;
  name: string;
  phone: string; // formato internacional apenas números (ex: 5511970810467)
  is_active: boolean;
  is_deleted: boolean;
  display_order: number;
  created_at: string;
}

export interface RotationMetrics {
  timezone: string;
  current_date_sp: string;
  current_timestamp_sp: string;
  intervals: {
    today: { label: string; start: string };
    '7d': { label: string; start: string };
    '15d': { label: string; start: string };
    '30d': { label: string; start: string };
  };
  totals: {
    today: number;
    last_7_days: number;
    last_15_days: number;
    last_30_days: number;
    all_time: number;
  };
  attendants: Array<Attendant & {
    dispatches_today: number;
    dispatches_7d: number;
    dispatches_15d: number;
    dispatches_30d: number;
    dispatches_total: number;
  }>;
}

export interface DistributeResult {
  success: boolean;
  attendant?: {
    id: string;
    name: string;
    phone: string;
  };
  error?: string;
  code?: 'NO_ACTIVE_ATTENDANTS' | 'NETWORK_ERROR' | 'CONFIG_ERROR' | 'IDEMPOTENCY_REPLAY';
  is_idempotent_replay?: boolean;
}

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Verifica se as credenciais do Supabase foram realmente configuradas
export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  !SUPABASE_URL.includes('seu-projeto') && 
  !SUPABASE_ANON_KEY.includes('sua-chave')
);

const SESSION_STORAGE_KEY = 'finzero_admin_session_token';

/**
 * Encaminha o lead para o próximo atendente no rodízio de forma concorrente e idempotente
 */
export async function distributeLead(attemptId: string, source: string = 'modal_proposta'): Promise<DistributeResult> {
  if (!isSupabaseConfigured) { return { success: false, error: 'Atendimento temporariamente indisponível. Tente novamente mais tarde.' }; }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/distribute-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ attempt_id: attemptId, source }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `Erro de conexão com o servidor de distribuição (${res.status})`,
        code: data.code || 'CONFIG_ERROR',
      };
    }

    return {
      success: true,
      attendant: data.attendant,
      is_idempotent_replay: data.is_idempotent_replay,
    };
  } catch (err: any) {
    console.error('Falha na requisição de distribuição:', err);
    return {
      success: false,
      error: `Não foi possível conectar ao servidor de atendimento: ${err.message || 'Verifique sua conexão'}`,
      code: 'NETWORK_ERROR',
    };
  }
}

/**
 * Autenticação do Administrador por Senha
 */
export async function adminLogin(password: string): Promise<{ success: boolean; error?: string; token?: string }> {
  if (!isSupabaseConfigured) { return { success: false, error: 'Atendimento temporariamente indisponível. Tente novamente mais tarde.' }; }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action: 'login', password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Falha ao autenticar no painel' };
    }

    sessionStorage.setItem(SESSION_STORAGE_KEY, data.token);
    return { success: true, token: data.token };
  } catch (err: any) {
    return { success: false, error: `Erro de rede ao conectar com Supabase Auth: ${err.message}` };
  }
}

export function getAdminToken(): string | null {
  return sessionStorage.getItem(SESSION_STORAGE_KEY);
}

export function clearAdminToken(): void {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  
}

/**
 * Verifica validade da sessão do administrador
 */
export async function verifyAdminSession(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;

  if (!isSupabaseConfigured) return false;

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'verify' }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.authenticated) {
      return true;
    }
    clearAdminToken();
    return false;
  } catch {
    return false;
  }
}

/**
 * Obtém métricas de encaminhamentos
 */
export async function fetchRotationMetrics(): Promise<{ success: boolean; metrics?: RotationMetrics; error?: string }> {
  if (!isSupabaseConfigured) { return { success: false, error: 'Atendimento temporariamente indisponível. Tente novamente mais tarde.' }; }

  const token = getAdminToken();
  if (!token) {
    return { success: false, error: 'Sessão não autenticada' };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-metrics`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Erro ao carregar métricas' };
    }

    return { success: true, metrics: data.metrics };
  } catch (err: any) {
    return { success: false, error: `Erro de rede ao carregar métricas: ${err.message}` };
  }
}

/**
 * Ações de Atendentes (Criar, Editar, Pausar/Despausar, Exclusão Lógica)
 */
export async function fetchAttendantsList(): Promise<{ success: boolean; attendants?: Attendant[]; error?: string }> {
  if (!isSupabaseConfigured) { return { success: false, error: 'Atendimento temporariamente indisponível. Tente novamente mais tarde.' }; }

  const token = getAdminToken();
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-attendants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'list' }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Erro ao listar atendentes' };
    }
    return { success: true, attendants: data.attendants };
  } catch (err: any) {
    return { success: false, error: `Erro de conexão: ${err.message}` };
  }
}

export async function createAttendant(name: string, phone: string, displayOrder: number = 0): Promise<{ success: boolean; attendant?: Attendant; error?: string }> {
  if (!isSupabaseConfigured) { return { success: false, error: 'Atendimento temporariamente indisponível. Tente novamente mais tarde.' }; }

  const token = getAdminToken();
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-attendants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'create', name, phone, display_order: displayOrder }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Erro ao cadastrar atendente' };
    }
    return { success: true, attendant: data.attendant };
  } catch (err: any) {
    return { success: false, error: `Erro de conexão: ${err.message}` };
  }
}

export async function updateAttendant(id: string, name?: string, phone?: string, displayOrder?: number): Promise<{ success: boolean; attendant?: Attendant; error?: string }> {
  if (!isSupabaseConfigured) { return { success: false, error: 'Atendimento temporariamente indisponível. Tente novamente mais tarde.' }; }

  const token = getAdminToken();
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-attendants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'update', id, name, phone, display_order: displayOrder }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Erro ao atualizar atendente' };
    }
    return { success: true, attendant: data.attendant };
  } catch (err: any) {
    return { success: false, error: `Erro de conexão: ${err.message}` };
  }
}

export async function toggleAttendantActive(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) { return { success: false, error: 'Atendimento temporariamente indisponível. Tente novamente mais tarde.' }; }

  const token = getAdminToken();
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-attendants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'toggle_active', id, is_active: isActive }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Erro ao alterar status do atendente' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Erro de conexão: ${err.message}` };
  }
}

export async function softDeleteAttendant(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) { return { success: false, error: 'Atendimento temporariamente indisponível. Tente novamente mais tarde.' }; }

  const token = getAdminToken();
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-attendants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'soft_delete', id }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Erro ao excluir atendente' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Erro de conexão: ${err.message}` };
  }
}
