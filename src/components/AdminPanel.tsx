import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Phone, 
  Play, 
  Pause, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  LogOut, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  ArrowLeft,
  X,
  CheckCircle2,
  ExternalLink,
  Info
} from 'lucide-react';
import {
  Attendant,
  RotationMetrics,
  isSupabaseConfigured,
  adminLogin,
  verifyAdminSession,
  clearAdminToken,
  fetchRotationMetrics,
  createAttendant,
  updateAttendant,
  toggleAttendantActive,
  softDeleteAttendant
} from '../services/whatsappService';

interface AdminPanelProps {
  onBackToSite: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToSite }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  const [metrics, setMetrics] = useState<RotationMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string>('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  
  const [selectedAttendant, setSelectedAttendant] = useState<Attendant | null>(null);

  // Form states
  const [formName, setFormName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formOrder, setFormOrder] = useState<number>(0);
  const [submittingForm, setSubmittingForm] = useState<boolean>(false);

  // Initial Auth Check
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setCheckingAuth(true);
    const authed = await verifyAdminSession();
    setIsAuthenticated(authed);
    setCheckingAuth(false);
    if (authed) {
      loadMetrics();
    }
  };

  const loadMetrics = async () => {
    setLoadingMetrics(true);
    setActionError('');
    const res = await fetchRotationMetrics();
    if (res.success && res.metrics) {
      setMetrics(res.metrics);
    } else {
      setActionError(res.error || 'Não foi possível carregar os dados de métricas.');
    }
    setLoadingMetrics(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setLoginLoading(true);
    setLoginError('');

    const res = await adminLogin(passwordInput.trim());
    if (res.success) {
      setIsAuthenticated(true);
      setPasswordInput('');
      loadMetrics();
    } else {
      setLoginError(res.error || 'Senha incorreta.');
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    clearAdminToken();
    setIsAuthenticated(false);
    setMetrics(null);
  };

  // Format international phone visually e.g. 5511970810467 -> +55 (11) 97081-0467
  const formatPhoneVisual = (phone: string) => {
    const p = phone.replace(/\D/g, '');
    if (p.startsWith('55') && p.length === 13) {
      return `+55 (${p.slice(2, 4)}) ${p.slice(4, 9)}-${p.slice(9)}`;
    }
    if (p.startsWith('55') && p.length === 12) {
      return `+55 (${p.slice(2, 4)}) ${p.slice(4, 8)}-${p.slice(8)}`;
    }
    return `+${p}`;
  };

  // Create Attendant
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = formPhone.replace(/\D/g, '');
    if (!formName.trim()) {
      setActionError('Digite o nome do atendente.');
      return;
    }
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      setActionError('O número de WhatsApp deve ter entre 10 e 15 dígitos com código do país (ex: 5511970810467).');
      return;
    }

    setSubmittingForm(true);
    setActionError('');
    const res = await createAttendant(formName, cleanPhone, formOrder);
    setSubmittingForm(false);

    if (res.success) {
      setIsCreateModalOpen(false);
      setFormName('');
      setFormPhone('');
      setFormOrder(0);
      setActionSuccess('Atendente cadastrado com sucesso!');
      loadMetrics();
      setTimeout(() => setActionSuccess(''), 4000);
    } else {
      setActionError(res.error || 'Erro ao cadastrar atendente.');
    }
  };

  // Edit Attendant
  const openEdit = (att: Attendant) => {
    setSelectedAttendant(att);
    setFormName(att.name);
    setFormPhone(att.phone);
    setFormOrder(att.display_order || 0);
    setIsEditModalOpen(true);
    setActionError('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttendant) return;

    const cleanPhone = formPhone.replace(/\D/g, '');
    if (!formName.trim()) {
      setActionError('Digite o nome do atendente.');
      return;
    }
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      setActionError('O número de WhatsApp deve conter apenas dígitos (10 a 15 números, ex: 5511970810467).');
      return;
    }

    setSubmittingForm(true);
    setActionError('');
    const res = await updateAttendant(selectedAttendant.id, formName, cleanPhone, formOrder);
    setSubmittingForm(false);

    if (res.success) {
      setIsEditModalOpen(false);
      setSelectedAttendant(null);
      setActionSuccess('Dados do atendente atualizados com sucesso!');
      loadMetrics();
      setTimeout(() => setActionSuccess(''), 4000);
    } else {
      setActionError(res.error || 'Erro ao atualizar dados.');
    }
  };

  // Toggle Active (Pause / Resume)
  const handleToggle = async (att: Attendant) => {
    setActionError('');
    const newStatus = !att.is_active;
    const res = await toggleAttendantActive(att.id, newStatus);
    if (res.success) {
      setActionSuccess(`Atendente ${newStatus ? 'ativado' : 'pausado'} no rodízio.`);
      loadMetrics();
      setTimeout(() => setActionSuccess(''), 4000);
    } else {
      setActionError(res.error || 'Não foi possível alterar o status do atendente.');
    }
  };

  // Soft Delete Confirmation
  const openDelete = (att: Attendant) => {
    setSelectedAttendant(att);
    setIsDeleteModalOpen(true);
    setActionError('');
  };

  const handleConfirmDelete = async () => {
    if (!selectedAttendant) return;
    setSubmittingForm(true);
    setActionError('');
    const res = await softDeleteAttendant(selectedAttendant.id);
    setSubmittingForm(false);
    setIsDeleteModalOpen(false);

    if (res.success) {
      setActionSuccess(`Atendente ${selectedAttendant.name} excluído logicamente. O histórico de encaminhamentos foi mantido.`);
      setSelectedAttendant(null);
      loadMetrics();
      setTimeout(() => setActionSuccess(''), 4000);
    } else {
      setActionError(res.error || 'Erro ao excluir atendente.');
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#05BCB4] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Verificando sessão de administrador...</p>
        </div>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-between p-4 sm:p-8">
        <div className="max-w-md w-full mx-auto my-auto space-y-6">
          {/* Logo & Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#05BCB4] flex items-center justify-center text-white font-black text-3xl mx-auto shadow-lg shadow-[#05BCB4]/30">
              F
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Painel de Atendentes WhatsApp
            </h1>
            <p className="text-xs text-slate-400">
              Gerencie a distribuição e o rodízio de leads em tempo real
            </p>
          </div>

          {/* Configuration status indicator */}
          <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-[#05BCB4]" />
              <span>Autenticação Segura no Backend</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              {isSupabaseConfigured ? (
                <span className="text-emerald-400 font-medium">
                  Conectado ao Supabase. Senha validada via Edge Function protegida contra força bruta.
                </span>
              ) : (
                <span className="text-amber-400 font-medium">
                  Modo Demonstração (VITE_SUPABASE_URL não detectado). Para testar o painel no ambiente de preview use a senha: <code className="bg-slate-900 px-1 py-0.5 rounded text-white font-mono">admin123</code>.
                </span>
              )}
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Senha de Administrador
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Digite a senha de acesso"
                autoFocus
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:border-[#05BCB4] focus:ring-2 focus:ring-[#05BCB4]/20 outline-none transition-all text-slate-900"
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-snug">{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 bg-[#05BCB4] hover:bg-[#04A69F] active:scale-[0.99] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#05BCB4]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loginLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Validando senha...</span>
                </>
              ) : (
                <span>Acessar Painel</span>
              )}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onBackToSite}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar para o site Finzero</span>
              </button>
            </div>
          </form>
        </div>

        <div className="text-center text-[11px] text-slate-500">
          Finzero Lead Engine · Distribuição segura de atendentes WhatsApp
        </div>
      </div>
    );
  }

  // DASHBOARD SCREEN (AUTHENTICATED)
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Top Bar */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#05BCB4] flex items-center justify-center text-white font-black text-xl shadow-md shadow-[#05BCB4]/25">
              F
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-white block leading-tight">
                Painel Finzero
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#05BCB4]" />
                <span>Fuso: {metrics?.timezone || 'America/Sao_Paulo'}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBackToSite}
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors hidden sm:flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Site</span>
            </button>

            <button
              onClick={loadMetrics}
              disabled={loadingMetrics}
              title="Atualizar métricas"
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loadingMetrics ? 'animate-spin text-[#05BCB4]' : ''}`} />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs font-bold text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/30 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
        
        {/* Environment Status Banner */}
        <div className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isSupabaseConfigured 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="font-bold">
              {isSupabaseConfigured ? 'Produção Conectada ao Supabase' : 'Modo Demonstração Ativo (Preview Local)'}
            </span>
            <span className="text-slate-400 hidden sm:inline">·</span>
            <span className="text-[11px] text-slate-600">
              {isSupabaseConfigured 
                ? 'Rodízio concorrente persistido no PostgreSQL com locks transacionais e Edge Functions'
                : 'Para persistência real e multi-usuário, configure o Supabase e execute a migration fornecida'}
            </span>
          </div>

          <div className="text-[11px] font-semibold text-slate-600 self-start sm:self-auto">
            Hoje em SP: <strong className="text-slate-900 font-mono">{metrics?.current_date_sp || 'Calculando...'}</strong>
          </div>
        </div>

        {/* Global Feedback Messages */}
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Section 1: Aggregate Metrics */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Encaminhamentos Realizados</h2>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-[#05BCB4]" />
                <span>Contabiliza leads distribuídos para o WhatsApp oficial. Não afirma mensagens recebidas.</span>
              </p>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Intervalos inclusivos de dias de calendário (America/Sao_Paulo)
            </span>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Hoje */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-[#05BCB4]">Hoje</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
                {metrics?.totals.today ?? 0}
              </div>
              <span className="text-[11px] text-slate-400">Desde 00:00 (SP)</span>
            </div>

            {/* 7 Dias */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Últimos 7 dias</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
                {metrics?.totals.last_7_days ?? 0}
              </div>
              <span className="text-[11px] text-slate-400">7 dias de calendário</span>
            </div>

            {/* 15 Dias */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Últimos 15 dias</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
                {metrics?.totals.last_15_days ?? 0}
              </div>
              <span className="text-[11px] text-slate-400">15 dias de calendário</span>
            </div>

            {/* 30 Dias */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Últimos 30 dias</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
                {metrics?.totals.last_30_days ?? 0}
              </div>
              <span className="text-[11px] text-slate-400">30 dias de calendário</span>
            </div>

            {/* Total Geral */}
            <div className="p-5 rounded-2xl bg-slate-900 text-white col-span-2 sm:col-span-1 shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-[#05BCB4]">Total Geral</span>
              <div className="text-3xl font-extrabold text-white mt-1 tabular-nums">
                {metrics?.totals.all_time ?? 0}
              </div>
              <span className="text-[11px] text-slate-400">Histórico acumulado</span>
            </div>
          </div>
        </div>

        {/* Section 2: Attendants List & Management */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#05BCB4]" />
                <span>Atendentes do Rodízio</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cadastre e configure os números que receberão os leads em ordem de rodízio global.
              </p>
            </div>

            <button
              onClick={() => {
                setFormName('');
                setFormPhone('');
                setFormOrder((metrics?.attendants.length || 0) + 1);
                setIsCreateModalOpen(true);
                setActionError('');
              }}
              className="px-4 py-2.5 bg-[#05BCB4] hover:bg-[#04A69F] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-[#05BCB4]/20 flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Atendente</span>
            </button>
          </div>

          {/* Attendants Table */}
          {metrics?.attendants && metrics.attendants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Ordem</th>
                    <th className="py-3 px-3">Atendente</th>
                    <th className="py-3 px-3">WhatsApp Internacional</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-center">Hoje</th>
                    <th className="py-3 px-3 text-center">7d</th>
                    <th className="py-3 px-3 text-center">15d</th>
                    <th className="py-3 px-3 text-center">30d</th>
                    <th className="py-3 px-3 text-center">Total</th>
                    <th className="py-3 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.attendants.map((att) => {
                    const isPaused = !att.is_active && !att.is_deleted;
                    const isDeleted = att.is_deleted;

                    return (
                      <tr 
                        key={att.id} 
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isDeleted ? 'opacity-50 bg-slate-50' : ''
                        }`}
                      >
                        <td className="py-3 px-3 font-mono text-slate-500 tabular-nums">
                          {att.display_order}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {att.name}
                          {isDeleted && (
                            <span className="ml-2 text-[10px] text-slate-500 font-normal italic">
                              (Excluído do rodízio)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">
                          <div>{formatPhoneVisual(att.phone)}</div>
                          <div className="text-[10px] text-slate-400">{att.phone}</div>
                        </td>
                        <td className="py-3 px-3">
                          {isDeleted ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">
                              Excluído
                            </span>
                          ) : isPaused ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
                              Pausado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                              Ativo
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-900 tabular-nums">
                          {att.dispatches_today}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-700 tabular-nums">
                          {att.dispatches_7d}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-700 tabular-nums">
                          {att.dispatches_15d}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-700 tabular-nums">
                          {att.dispatches_30d}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-[#03827C] tabular-nums">
                          {att.dispatches_total}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {!isDeleted ? (
                            <div className="inline-flex items-center gap-1.5">
                              {/* Toggle Active / Pause */}
                              <button
                                type="button"
                                onClick={() => handleToggle(att)}
                                title={att.is_active ? 'Pausar Atendente' : 'Ativar Atendente'}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  att.is_active 
                                    ? 'border-amber-200 text-amber-700 hover:bg-amber-50' 
                                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                {att.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => openEdit(att)}
                                title="Editar dados"
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete with confirmation */}
                              <button
                                type="button"
                                onClick={() => openDelete(att)}
                                title="Excluir logicamente"
                                className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Histórico fixo</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">Nenhum atendente cadastrado ainda</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Cadastre o primeiro atendente para que os leads sejam distribuídos automaticamente para o WhatsApp.
              </p>
            </div>
          )}
        </div>

        {/* Security & System Architecture Info */}
        <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-3 text-xs leading-relaxed">
          <div className="flex items-center gap-2 text-[#05BCB4] font-bold text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>Arquitetura de Segurança e Privacidade</span>
          </div>
          <p className="text-slate-300">
            • <strong>Transação com Trava de Concorrência:</strong> O rodízio utiliza <code className="bg-slate-800 px-1 py-0.5 rounded text-white font-mono">FOR UPDATE</code> em nível de banco de dados para garantir que dois leads simultâneos nunca recebam o mesmo atendente por colisão de milissegundos.
          </p>
          <p className="text-slate-300">
            • <strong>Idempotência:</strong> Cada tentativa de envio gera um identificador único no cliente. Cliques duplos acidentais retornam o mesmo atendente sem avançar a fila e sem contar em duplicidade.
          </p>
          <p className="text-slate-300">
            • <strong>Privacidade LGPD:</strong> Não são armazenados CPFs, rendas, datas de nascimento ou dados de crédito no histórico de distribuição. Apenas o ID de atendimento e horário de encaminhamento são registrados.
          </p>
        </div>

      </main>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#05BCB4]" />
                <span>Novo Atendente WhatsApp</span>
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Completo ou Identificador
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Silva ou Equipe Vendas 1"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#05BCB4] focus:ring-2 focus:ring-[#05BCB4]/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  WhatsApp Internacional (Apenas números)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 5511970810467"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:border-[#05BCB4] focus:ring-2 focus:ring-[#05BCB4]/20 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Formato internacional com código do país (DDI 55) + DDD + número celular (10 a 15 dígitos).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ordem de Exibição / Prioridade
                </label>
                <input
                  type="number"
                  value={formOrder}
                  onChange={(e) => setFormOrder(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#05BCB4] focus:ring-2 focus:ring-[#05BCB4]/20 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#05BCB4] hover:bg-[#04A69F] rounded-xl transition-all shadow-md shadow-[#05BCB4]/25 cursor-pointer disabled:opacity-50"
                >
                  {submittingForm ? 'Salvando...' : 'Salvar Atendente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#05BCB4]" />
                <span>Editar Atendente</span>
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Completo ou Identificador
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#05BCB4] focus:ring-2 focus:ring-[#05BCB4]/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  WhatsApp Internacional (Apenas números)
                </label>
                <input
                  type="text"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:border-[#05BCB4] focus:ring-2 focus:ring-[#05BCB4]/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ordem de Exibição
                </label>
                <input
                  type="number"
                  value={formOrder}
                  onChange={(e) => setFormOrder(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#05BCB4] focus:ring-2 focus:ring-[#05BCB4]/20 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#05BCB4] hover:bg-[#04A69F] rounded-xl transition-all shadow-md shadow-[#05BCB4]/25 cursor-pointer disabled:opacity-50"
                >
                  {submittingForm ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SOFT DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && selectedAttendant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500">Excluir atendente do rodízio</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Deseja realmente remover o atendente <strong>{selectedAttendant.name}</strong> ({selectedAttendant.phone}) do rodízio ativo?
            </p>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <strong>Preservação de Histórico:</strong>
              <p>
                Esta exclusão é lógica: o atendente deixará imediatamente de receber novos leads, mas todos os encaminhamentos passados continuarão preservados para contagem nos relatórios.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submittingForm}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-md shadow-rose-600/25 cursor-pointer disabled:opacity-50"
              >
                {submittingForm ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
