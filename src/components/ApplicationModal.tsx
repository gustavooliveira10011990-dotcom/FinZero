import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Lock, 
  Building2, 
  Wallet, 
  MessageCircle, 
  Sparkles,
  BadgeCheck,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { ApplicationFormData, LoanPurpose, EmploymentType } from '../types';
import { formatCurrency, maskCPF, maskPhone, maskCEP, isValidCPF, calculateLoan } from '../utils/formatters';
import { distributeLead } from '../services/whatsappService';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount: number;
  initialMonths: number;
}

const PURPOSES: { id: LoanPurpose; label: string; icon: string }[] = [
  { id: 'dividas', label: 'Quitar dívidas / Limpar Nome', icon: '💳' },
  { id: 'reforma', label: 'Reforma ou Construção', icon: '🏠' },
  { id: 'capital_giro', label: 'Investir no Negócio / Empresa', icon: '📈' },
  { id: 'veiculo', label: 'Comprar ou Arrumar Veículo', icon: '🚗' },
  { id: 'pessoal', label: 'Despesas Pessoais / Família', icon: '🎯' },
  { id: 'emergencia', label: 'Saúde ou Emergência', icon: '🩺' },
];

const EMPLOYMENT_TYPES: { id: EmploymentType; label: string }[] = [
  { id: 'clt', label: 'Trabalhador CLT (Carteira assinada)' },
  { id: 'autonomo', label: 'Autônomo / Profissional Liberal / MEI' },
  { id: 'servidor', label: 'Servidor Público / Militar' },
  { id: 'aposentado_inss', label: 'Aposentado ou Pensionista INSS' },
  { id: 'empresario', label: 'Empresário / Sócio' },
];

export const ApplicationModal: React.FC<ApplicationModalProps> = ({
  isOpen,
  onClose,
  initialAmount,
  initialMonths,
}) => {
  const [step, setStep] = useState<number>(1);
  const [analyzingProgress, setAnalyzingProgress] = useState<number>(0);
  const [analysisStatusText, setAnalysisStatusText] = useState<string>('Iniciando análise de perfil...');

  const [formData, setFormData] = useState<ApplicationFormData>({
    amount: initialAmount || 5000,
    months: initialMonths || 24,
    purpose: 'dividas',
    fullName: '',
    cpf: '',
    birthDate: '',
    phone: '',
    email: '',
    cep: '',
    employmentType: 'clt',
    monthlyIncome: '3500',
    isNegativado: 'nao',
    bankAccountType: 'corrente',
    pixKeyType: 'cpf',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string>(() => `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchError, setDispatchError] = useState<string>('');

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        amount: initialAmount || 5000,
        months: initialMonths || 24,
      }));
      setStep(1);
      setErrors({});
      setAnalyzingProgress(0);
      setDispatchError('');
      setIsDispatching(false);
      // Generate a new idempotency attempt ID for each new application session
      setAttemptId(`attempt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
    }
  }, [isOpen, initialAmount, initialMonths]);

  // Handle Analysis progress simulation when reaching step 5
  useEffect(() => {
    if (step === 5) {
      setAnalyzingProgress(10);
      setAnalysisStatusText('Consultando instituições financeiras parceiras...');

      const t1 = setTimeout(() => {
        setAnalyzingProgress(45);
        setAnalysisStatusText('Verificando as melhores ofertas disponíveis para seu perfil...');
      }, 900);

      const t2 = setTimeout(() => {
        setAnalyzingProgress(80);
        setAnalysisStatusText('Calculando as menores taxas de CET disponíveis...');
      }, 1900);

      const t3 = setTimeout(() => {
        setAnalyzingProgress(100);
        setAnalysisStatusText('Propostas pré-aprovadas encontradas com sucesso!');
        setTimeout(() => {
          setStep(6);
        }, 600);
      }, 2900);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [step]);

  if (!isOpen) return null;

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim() || formData.fullName.trim().split(' ').length < 2) {
      errs.fullName = 'Digite seu nome completo (nome e sobrenome).';
    }
    if (!isValidCPF(formData.cpf)) {
      errs.cpf = 'CPF inválido. Verifique os 11 dígitos.';
    }
    if (!formData.birthDate) {
      errs.birthDate = 'Informe sua data de nascimento.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs: Record<string, string> = {};
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      errs.phone = 'Informe um WhatsApp com DDD válido.';
    }
    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      errs.email = 'Informe um e-mail válido.';
    }
    const cleanCep = formData.cep.replace(/\D/g, '');
    if (cleanCep.length < 8) {
      errs.cep = 'Informe um CEP válido (8 dígitos).';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    } else if (step === 3) {
      if (validateStep3()) setStep(4);
    } else if (step === 4) {
      setStep(5); // triggers analysis
    }
  };

  const simulation = calculateLoan(formData.amount, formData.months);

  // Encaminhamento real e idempotente de WhatsApp via backend com persistência
  const handleOpenWhatsApp = async () => {
    if (isDispatching) return; // Previne duplo clique concorrente no frontend
    setIsDispatching(true);
    setDispatchError('');

    try {
      const res = await distributeLead(attemptId, 'modal_proposta');

      if (!res.success || !res.attendant) {
        setIsDispatching(false);
        if (res.code === 'NO_ACTIVE_ATTENDANTS') {
          setDispatchError('Nenhum atendente ativo configurado no momento no sistema de atendimento. Por favor, tente novamente em alguns instantes.');
        } else {
          setDispatchError(res.error || 'Não foi possível conectar ao sistema de atendimento. Por favor, tente novamente.');
        }
        return;
      }

      // Atribuição persistida com sucesso!
      // Formata mensagem sem dados pessoais sensíveis (sem CPF, sem data de nascimento, sem renda)
      const cleanPhone = res.attendant.phone.replace(/\D/g, '');
      const firstName = formData.fullName.trim().split(' ')[0] || 'Cliente';
      
      const safeText = encodeURIComponent(
        `Olá! Sou ${firstName}. Realizei uma simulação na Finzero no valor de ${formatCurrency(formData.amount)} em ${formData.months} parcelas e gostaria de dar continuidade à minha proposta com um especialista.`
      );

      const targetUrl = `https://wa.me/${cleanPhone}?text=${safeText}`;
      setIsDispatching(false);

      // Redirecionamento após persistência verificada
      const win = window.open(targetUrl, '_blank');
      if (!win) {
        window.location.href = targetUrl;
      }
    } catch (err: any) {
      setIsDispatching(false);
      setDispatchError(`Erro ao conectar com o serviço de atendimento: ${err.message || 'Verifique sua conexão'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div 
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#05BCB4] flex items-center justify-center text-white font-black text-sm shadow-xs">
              F
            </div>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-500">
              {step <= 4 && `Etapa ${step} de 4`}
              {step === 5 && 'Análise de Crédito'}
              {step === 6 && 'Proposta Preliminar'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        {step <= 4 && (
          <div className="w-full bg-slate-100 h-1.5">
            <div
              className="bg-[#05BCB4] h-1.5 transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        )}

        <div className="p-6 sm:p-8">
          {/* STEP 1: Valor e Finalidade */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Finalidade do Empréstimo</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Selecione o motivo principal para ajustarmos as taxas ideais para você.
                </p>
              </div>

              {/* Value summary review */}
              <div className="p-4 rounded-2xl bg-[#05BCB4]/10 border border-[#05BCB4]/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-[#03827C]">Valor selecionado:</span>
                  <div className="text-xl font-black text-slate-900 tabular-nums">
                    {formatCurrency(formData.amount)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium text-[#03827C]">Prazo:</span>
                  <div className="text-sm font-bold text-slate-900">
                    {formData.months} meses ({formatCurrency(simulation.monthlyPayment)}/mês)
                  </div>
                </div>
              </div>

              {/* Purpose options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PURPOSES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, purpose: item.id })}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.purpose === item.id
                        ? 'border-[#05BCB4] bg-[#05BCB4]/10 text-slate-900 font-bold ring-1 ring-[#05BCB4]'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-xs leading-snug">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Dados Pessoais */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Seus Dados Pessoais</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Necessários para encontrarmos a melhor opção de empréstimo para você.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  placeholder="Ex: João Carlos da Silva"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#05BCB4] focus:ring-2 focus:ring-[#05BCB4]/20 outline-none"
                />
                {errors.fullName && <p className="text-xs text-rose-500 mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CPF
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:border-[#05BCB4] focus:ring-2 focus:ring-[#05BCB4]/20 outline-none"
                />
                {errors.cpf && <p className="text-xs text-rose-500 mt-1">{errors.cpf}</p>}
                <p className="text-[11px] text-slate-400 mt-1">
                  🔒 Seus dados estão protegidos pela Lei Geral de Proteção de Dados (LGPD).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#05BCB4] focus:ring-2 focus:ring-[#05BCB4]/20 outline-none"
                />
                {errors.birthDate && <p className="text-xs text-rose-500 mt-1">{errors.birthDate}</p>}
              </div>
            </div>
          )}

          {/* STEP 3: Contato */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Como podemos te contatar?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Você receberá a resposta da análise via WhatsApp e E-mail.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp / Celular com DDD
                </label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:border-[#05BCB4] focus:ring-2 focus:ring-[#05BCB4]/20 outline-none"
                />
                {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail Principal
                </label>
                <input
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#05BCB4] focus:ring-2 focus:ring-[#05BCB4]/20 outline-none"
                />
                {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CEP Residencial
                </label>
                <input
                  type="text"
                  placeholder="00000-000"
                  maxLength={9}
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: maskCEP(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:border-[#05BCB4] focus:ring-2 focus:ring-[#05BCB4]/20 outline-none"
                />
                {errors.cep && <p className="text-xs text-rose-500 mt-1">{errors.cep}</p>}
              </div>
            </div>
          )}

          {/* STEP 4: Perfil Financeiro */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Perfil Financeiro</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Temos linhas para quem tem carteira assinada, autônomos e negativados.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ocupação Profissional
                </label>
                <select
                  value={formData.employmentType}
                  onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as EmploymentType })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:border-[#05BCB4] focus:ring-2 focus:ring-[#05BCB4]/20 outline-none cursor-pointer"
                >
                  {EMPLOYMENT_TYPES.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Renda Mensal Estimada
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm text-slate-400 font-medium">R$</span>
                  <input
                    type="number"
                    placeholder="3500"
                    value={formData.monthlyIncome}
                    onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#05BCB4] focus:ring-2 focus:ring-[#05BCB4]/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Possui restrição no nome (negativado no SPC/Serasa)?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isNegativado: 'nao' })}
                    className={`p-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                      formData.isNegativado === 'nao'
                        ? 'border-[#05BCB4] bg-[#05BCB4]/10 text-slate-900 ring-1 ring-[#05BCB4]'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    Não (Nome Limpo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isNegativado: 'sim' })}
                    className={`p-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                      formData.isNegativado === 'sim'
                        ? 'border-amber-500 bg-amber-50 text-amber-950 ring-1 ring-amber-500'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    Sim (Estou Negativado)
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  *Não se preocupe: possuímos parceiros especialistas em empréstimo para negativados.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: Animated Processing State */}
          {step === 5 && (
            <div className="py-8 text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#05BCB4]/15 flex items-center justify-center text-[#05BCB4] animate-pulse">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Analisando propostas disponíveis...</h3>
                <p className="text-sm text-slate-600">{analysisStatusText}</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-3 max-w-sm mx-auto overflow-hidden">
                <div
                  className="bg-[#05BCB4] h-3 rounded-full transition-all duration-500"
                  style={{ width: `${analyzingProgress}%` }}
                />
              </div>

              <div className="text-xs text-slate-400">
                🔒 Conexão segura e sigilo de dados garantido
              </div>
            </div>
          )}

          {/* STEP 6: Pre-Approval Results Screen */}
          {step === 6 && (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#05BCB4]/15 text-[#03827C] text-xs font-bold mb-1">
                  <BadgeCheck className="w-4 h-4 text-[#05BCB4]" />
                  Pré-Aprovação Disponível!
                </div>
                <h3 className="text-2xl font-black text-slate-900">
                  Boas notícias, {formData.fullName.split(' ')[0]}!
                </h3>
                <p className="text-xs text-slate-600">
                  Encontramos instituições financeiras parceiras com condições especiais para seu perfil.
                </p>
              </div>

              {/* Main Proposal Highlight */}
              <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs text-[#05BCB4] font-bold uppercase tracking-wider">
                      Proposta Recomendada
                    </span>
                    <div className="text-2xl font-extrabold text-white mt-0.5 tabular-nums">
                      {formatCurrency(formData.amount)}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-[#05BCB4]/20 text-[#05BCB4] text-xs font-semibold border border-[#05BCB4]/30">
                    Liberação via PIX
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400">Parcelas:</span>
                    <div className="font-bold text-white tabular-nums">
                      {formData.months}x de ~{formatCurrency(simulation.monthlyPayment)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Taxa inicial estimada:</span>
                    <div className="font-bold text-[#05BCB4]">1,49% ao mês</div>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#05BCB4] shrink-0" />
                  <span>Simulação gratuita. Conectamos você diretamente à financeira parceira.</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="space-y-3 pt-2">
                {dispatchError && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <strong className="block text-slate-900 font-bold">Aviso do Atendimento:</strong>
                      <p className="leading-relaxed text-slate-700">{dispatchError}</p>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  disabled={isDispatching}
                  className="w-full py-4 px-6 bg-[#05BCB4] hover:bg-[#04A69F] active:scale-[0.99] text-white font-bold text-sm sm:text-base rounded-xl transition-all shadow-lg shadow-[#05BCB4]/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isDispatching ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Conectando ao Atendente Oficial...</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-5 h-5" />
                      <span>Finalizar Proposta pelo WhatsApp Oficial</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Concluir mais tarde
                </button>
              </div>
            </div>
          )}

          {/* Stepper buttons for 1 to 4 */}
          {step <= 4 && (
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-6">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 bg-[#05BCB4] hover:bg-[#04A69F] active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-[#05BCB4]/20 transition-all cursor-pointer ml-auto"
              >
                <span>{step === 4 ? 'Ver Ofertas Disponíveis' : 'Continuar'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
