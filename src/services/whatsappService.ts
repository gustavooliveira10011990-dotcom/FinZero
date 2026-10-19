/**
 * Serviço de Gerenciamento e Distribuição de Atendentes WhatsApp
 * Suporta Supabase Edge Functions reais com tratamento explícito de erros,
 * e modo demonstração isolado quando o Supabase ainda não foi configurado.
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

// Storage em memória isolado para modo demonstração
class DemoStore {
  private attendants: Attendant[] = [
    {
      id: 'demo-1',
      name: 'Atendente Exemplo 01',
      phone: '5511970810467',
      is_active: true,
      is_deleted: false,
      display_order: 1,
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 'demo-2',
      name: 'Atendente Exemplo 02',
      phone: '5511999998888',
      is_active: true,
      is_deleted: false,
      display_order: 2,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ];

  private dispatches: Array<{
    id: string;
    attempt_id: string;
    attendant_id: string;
    attendant_name: string;
    attendant_phone: string;
    created_at: string;
  }> = [];

  private lastIndex = -1;
  private authenticated = false;

  login(password: string) {
    if (password === 'admin123' || password === 'demo') {
      this.authenticated = true;
      return true;
    }
    return false;
  }

  logout() {
    this.authenticated = false;
  }

  isAuthed() {
    return this.authenticated;
  }

  getAttendants() {
    return [...this.attendants].sort((a, b) => {
      if (a.is_deleted !== b.is_deleted) return a.is_deleted ? 1 : -1;
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return a.display_order - b.display_order;
    });
  }

  createAttendant(name: string, phone: string, display_order: number = 0): Attendant {
    const cleanPhone = phone.replace(/\D/g, '');
    const newAttendant: Attendant = {
      id: `demo-${Date.now()}`,
      name: name.trim(),
      phone: cleanPhone,
      is_active: true,
      is_deleted: false,
      display_order,
      created_at: new Date().toISOString(),
    };
    this.attendants.push(newAttendant);
    return newAttendant;
  }

  updateAttendant(id: string, name?: string, phone?: string, display_order?: number) {
    const att = this.attendants.find(a => a.id === id);
    if (!att) throw new Error('Atendente não encontrado');
    if (name) att.name = name.trim();
    if (phone) att.phone = phone.replace(/\D/g, '');
    if (typeof display_order === 'number') att.display_order = display_order;
    return att;
  }

  toggleActive(id: string, is_active: boolean) {
    const att = this.attendants.find(a => a.id === id);
    if (!att) throw new Error('Atendente não encontrado');
    att.is_active = is_active;
    return att;
  }

  softDelete(id: string) {
    const att = this.attendants.find(a => a.id === id);
    if (!att) throw new Error('Atendente não encontrado');
    att.is_deleted = true;
    att.is_active = false;
    return att;
  }

  distribute(attemptId: string): DistributeResult {
    // Idempotência
    const existing = this.dispatches.find(d => d.attempt_id === attemptId);
    if (existing) {
      return {
        success: true,
        attendant: {
          id: existing.attendant_id,
          name: existing.attendant_name,
          phone: existing.attendant_phone,
        },
        is_idempotent_replay: true,
      };
    }

    const active = this.attendants.filter(a => a.is_active && !a.is_deleted)
      .sort((a, b) => a.display_order - b.display_order);

    if (active.length === 0) {
      return {
        success: false,
        error: 'Nenhum atendente ativo configurado no momento',
        code: 'NO_ACTIVE_ATTENDANTS',
      };
    }

    this.lastIndex = (this.lastIndex + 1) % active.length;
    const chosen = active[this.lastIndex];

    this.dispatches.push({
      id: `disp-${Date.now()}`,
      attempt_id: attemptId,
      attendant_id: chosen.id,
      attendant_name: chosen.name,
      attendant_phone: chosen.phone,
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      attendant: {
        id: chosen.id,
        name: chosen.name,
        phone: chosen.phone,
      },
      is_idempotent_replay: false,
    };
  }

  getMetrics(): RotationMetrics {
    // Cálculo de datas em America/Sao_Paulo
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
    const currentDateSp = formatter.format(now); // YYYY-MM-DD

    const getMidnightSp = (daysAgo: number) => {
      const d = new Date(now.getTime() - daysAgo * 86400000);
      const str = formatter.format(d);
      return new Date(`${str}T00:00:00-03:00`).getTime();
    };

    const todayStart = getMidnightSp(0);
    const sevenDaysStart = getMidnightSp(6);
    const fifteenDaysStart = getMidnightSp(14);
    const thirtyDaysStart = getMidnightSp(29);

    const calcCounts = (filterAttendantId?: string) => {
      const list = filterAttendantId 
        ? this.dispatches.filter(d => d.attendant_id === filterAttendantId)
        : this.dispatches;

      return {
        today: list.filter(d => new Date(d.created_at).getTime() >= todayStart).length,
        last_7_days: list.filter(d => new Date(d.created_at).getTime() >= sevenDaysStart).length,
        last_15_days: list.filter(d => new Date(d.created_at).getTime() >= fifteenDaysStart).length,
        last_30_days: list.filter(d => new Date(d.created_at).getTime() >= thirtyDaysStart).length,
        all_time: list.length,
      };
    };

    const totals = calcCounts();
    const attendantsMetrics = this.getAttendants().map(att => {
      const counts = calcCounts(att.id);
      return {
        ...att,
        dispatches_today: counts.today,
        dispatches_7d: counts.last_7_days,
        dispatches_15d: counts.last_15_days,
        dispatches_30d: counts.last_30_days,
        dispatches_total: counts.all_time,
      };
    });

    return {
      timezone: 'America/Sao_Paulo',
      current_date_sp: currentDateSp,
      current_timestamp_sp: now.toISOString(),
      intervals: {
        today: { label: 'Hoje', start: new Date(todayStart).toISOString() },
        '7d': { label: 'Últimos 7 dias', start: new Date(sevenDaysStart).toISOString() },
        '15d': { label: 'Últimos 15 dias', start: new Date(fifteenDaysStart).toISOString() },
        '30d': { label: 'Últimos 30 dias', start: new Date(thirtyDaysStart).toISOString() },
      },
      totals,
      attendants: attendantsMetrics,
    };
  }
}

const demoStore = new DemoStore();

/**
 * Encaminha o lead para o próximo atendente no rodízio de forma concorrente e idempotente
 */
export async function distributeLead(attemptId: string, source: string = 'modal_proposta'): Promise<DistributeResult> {
  if (!isSupabaseConfigured) {
    console.info('[Finzero] Operando em Modo Demonstração (VITE_SUPABASE_URL não configurado).');
    return demoStore.distribute(attemptId);
  }

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
  if (!isSupabaseConfigured) {
    const ok = demoStore.login(password);
    if (!ok) {
      return { success: false, error: 'Senha incorreta no Modo Demonstração. Use: admin123 ou demo' };
    }
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'demo_token');
    return { success: true, token: 'demo_token' };
  }

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
  if (!isSupabaseConfigured) {
    demoStore.logout();
  }
}

/**
 * Verifica validade da sessão do administrador
 */
export async function verifyAdminSession(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;

  if (!isSupabaseConfigured) {
    return demoStore.isAuthed();
  }

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
  if (!isSupabaseConfigured) {
    return { success: true, metrics: demoStore.getMetrics() };
  }

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
  if (!isSupabaseConfigured) {
    return { success: true, attendants: demoStore.getAttendants() };
  }

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
  if (!isSupabaseConfigured) {
    try {
      const att = demoStore.createAttendant(name, phone, displayOrder);
      return { success: true, attendant: att };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

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
  if (!isSupabaseConfigured) {
    try {
      const att = demoStore.updateAttendant(id, name, phone, displayOrder);
      return { success: true, attendant: att };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

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
  if (!isSupabaseConfigured) {
    try {
      demoStore.toggleActive(id, isActive);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

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
  if (!isSupabaseConfigured) {
    try {
      demoStore.softDelete(id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

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
