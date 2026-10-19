import React, { useState } from 'react';
import { formatCurrency } from '../utils/formatters';
import { ArrowRight, Lock, Zap, MessageCircle, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { distributeLead } from '../services/whatsappService';

interface LoanSimulatorProps {
  onApply?: (amount: number, months: number) => void;
}

const PRESET_AMOUNTS = [3000, 5000, 10000, 20000, 30000, 40000, 50000];

export const LoanSimulator: React.FC<LoanSimulatorProps> = ({ onApply }) => {
  const [amount, setAmount] = useState<number>(5000);
  const months = 24;
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  const handleSolicitarWhatsApp = async () => {
    if (isDispatching) return; // Idempotência / Previne duplo clique

    setIsDispatching(true);
    setDispatchError(null);
    setRedirectUrl(null);

    // Identificador único da tentativa para idempotência no backend
    const attemptId = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const result = await distributeLead(attemptId, 'simulador_direto');

      if (!result.success || !result.attendant) {
        setIsDispatching(false);
        if (result.error === 'NO_ACTIVE_ATTENDANTS') {
          setDispatchError('Nosso time de atendimento está indisponível no momento. Por favor, tente novamente em alguns minutos.');
        } else {
          setDispatchError(result.error || 'Não foi possível conectar com um atendente no momento. Tente novamente.');
        }
        return;
      }

      // Atendente atribuído com sucesso e persistido no banco
      const cleanPhone = result.attendant.phone.replace(/\D/g, '');
      const safeText = encodeURIComponent(
        `Olá! Fiz uma simulação de empréstimo no valor de ${formatCurrency(amount)} no site Finzero e gostaria de saber mais sobre as propostas disponíveis.`
      );

      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${safeText}`;
      setRedirectUrl(whatsappUrl);

      // Redireciona diretamente para o WhatsApp oficial do atendente
      window.location.href = whatsappUrl;

      // Chama callback opcional se houver
      if (onApply) {
        onApply(amount, months);
      }
    } catch (err: any) {
      setIsDispatching(false);
      setDispatchError('Falha ao conectar com o servidor de atendimento. Verifique sua conexão e tente novamente.');
    }
  };

  return (
    <div id="simulador" className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
      {/* Header of card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6 border-b border-slate-100">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#05BCB4]">Simulador Direto</span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Quanto você precisa?
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 self-start sm:self-auto">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Liberação via PIX</span>
        </div>
      </div>

      {/* Amount Control */}
      <div className="py-6 space-y-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-slate-600">Valor do empréstimo</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
            {formatCurrency(amount)}
          </span>
        </div>

        {/* Range input slider */}
        <input
          type="range"
          min={1000}
          max={50000}
          step={250}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#05BCB4] focus:outline-none"
        />

        <div className="flex justify-between text-xs text-slate-400 font-medium">
          <span>R$ 1.000</span>
          <span>R$ 25.000</span>
          <span>R$ 50.000</span>
        </div>

        {/* Quick select buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {PRESET_AMOUNTS.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setAmount(val)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                amount === val
                  ? 'bg-[#05BCB4] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              {formatCurrency(val)}
            </button>
          ))}
        </div>
      </div>

      {/* Action Button: Sem formulários de dados, vai DIRETO para o WhatsApp */}
      <div className="pt-5 border-t border-slate-100 space-y-3">
        {dispatchError && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Aviso:</strong> {dispatchError}
            </div>
          </div>
        )}

        {redirectUrl && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Atendente conectado! Redirecionando...</span>
            </div>
            <a
              href={redirectUrl}
              className="font-bold underline text-emerald-800 hover:text-emerald-950"
            >
              Abrir WhatsApp
            </a>
          </div>
        )}

        <button
          type="button"
          onClick={handleSolicitarWhatsApp}
          disabled={isDispatching}
          className="w-full py-4 px-6 bg-[#05BCB4] hover:bg-[#04A69F] disabled:opacity-75 disabled:cursor-wait active:scale-[0.99] text-white font-extrabold text-base rounded-2xl transition-all shadow-lg shadow-[#05BCB4]/25 flex items-center justify-center gap-2.5 cursor-pointer"
        >
          {isDispatching ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Conectando ao WhatsApp...</span>
            </>
          ) : (
            <>
              <MessageCircle className="w-5 h-5" />
              <span>Solicitar pelo WhatsApp</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Atendimento 100% online direto pelo WhatsApp oficial</span>
        </div>
      </div>
    </div>
  );
};
