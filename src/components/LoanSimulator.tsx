import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters';
import {
  ArrowRight,
  Zap,
  MessageCircle,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Minus,
  Sparkles
} from 'lucide-react';
import { distributeLead } from '../services/whatsappService';

interface LoanSimulatorProps {
  onApply?: (amount: number, months: number) => void;
}

const PRESET_AMOUNTS = [3000, 5000, 10000, 15000, 25000, 50000];

export const LoanSimulator: React.FC<LoanSimulatorProps> = ({ onApply }) => {
  const [amount, setAmount] = useState<number>(5000);
  const months = 24;
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  const handleAdjustAmount = (delta: number) => {
    setAmount((prev) => Math.min(50000, Math.max(1000, prev + delta)));
  };

  const handleSolicitarWhatsApp = () => {
    if (isDispatching) return;
    setIsDispatching(true);
    const attemptId = crypto.randomUUID();
    sessionStorage.setItem('finzero_pending_dispatch', JSON.stringify({ attemptId, amount, returnPath: /^\/kw\/?$/.test(window.location.pathname) ? '/kw' : '/' }));
    window.location.assign('/redirecionando');
  };

  return (
    <div
      id="simulador"
      className="w-full bg-white rounded-3xl border-2 border-[#05BCB4]/20 shadow-2xl shadow-[#05BCB4]/10 p-5 sm:p-7 transition-all relative overflow-hidden"
    >
      {/* Visual Top Highlight Accent */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#05BCB4] via-[#04A69F] to-emerald-400" />

      {/* Header of card: Mobile-Optimized with Quick Badges */}
      <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#05BCB4]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulação Imediata</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Quanto você precisa?
          </h2>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1.5 rounded-xl shrink-0">
          <Zap className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
          <span>Via PIX</span>
        </div>
      </div>

      {/* Amount Display & Finger-Friendly Steppers */}
      <div className="pt-5 pb-4 space-y-4">
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleAdjustAmount(-500)}
            disabled={amount <= 1000}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-xs"
            aria-label="Diminuir valor"
          >
            <Minus className="w-5 h-5" />
          </button>

          <div className="text-center">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Valor desejado
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
              {formatCurrency(amount)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleAdjustAmount(500)}
            disabled={amount >= 50000}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-xs"
            aria-label="Aumentar valor"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Range Slider for quick sliding */}
        <div className="space-y-1.5 px-1">
          <input
            type="range"
            min={1000}
            max={50000}
            step={250}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#05BCB4] focus:outline-none"
            aria-label="Controle deslizante de valor"
          />
          <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
            <span>R$ 1.000</span>
            <span>R$ 25.000</span>
            <span>R$ 50.000</span>
          </div>
        </div>

        {/* Preset Amount Buttons: High touch target for mobile thumb */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Escolha rápida:
          </span>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(val)}
                className={`text-xs font-bold py-2 px-1 rounded-xl transition-all cursor-pointer border text-center ${
                  amount === val
                    ? 'bg-[#05BCB4] text-white border-[#05BCB4] shadow-sm shadow-[#05BCB4]/30 scale-[1.02]'
                    : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100 active:scale-95'
                }`}
              >
                {formatCurrency(val)}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Main Action Section: Directly 'na cara do gol' to WhatsApp */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
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
          className="w-full py-4 px-5 bg-gradient-to-r from-[#05BCB4] to-[#04A69F] hover:from-[#04A69F] hover:to-[#038E88] disabled:opacity-75 disabled:cursor-wait active:scale-[0.98] text-white font-black text-base sm:text-lg rounded-2xl transition-all shadow-xl shadow-[#05BCB4]/30 flex items-center justify-center gap-2.5 cursor-pointer relative overflow-hidden group"
        >
          {isDispatching ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Conectando com atendente...</span>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-5 h-5 fill-white text-white" />
              </div>
              <div className="flex flex-col items-start text-left leading-tight">
                <span className="tracking-wide">SOLICITAR EMPRÉSTIMO</span>
              </div>
              <ArrowRight className="w-5 h-5 ml-auto shrink-0 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>

        {/* Quick Micro-Trust Guarantee */}
        <div className="grid grid-cols-1 gap-2 pt-1 text-[11px] text-slate-500 font-medium text-center">
          <div className="flex items-center justify-center gap-1.5 py-1 bg-slate-50 rounded-lg border border-slate-100">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#05BCB4]" />
            <span>Aceita negativados</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PendingDispatch { attemptId: string; amount?: number; returnPath?: string }

function pendingDispatch(): PendingDispatch {
  try {
    const stored = JSON.parse(sessionStorage.getItem('finzero_pending_dispatch') || 'null');
    if (stored && typeof stored.attemptId === 'string' && stored.attemptId.length > 0) return stored;
  } catch { /* Criar uma tentativa quando a rota for aberta diretamente. */ }
  const next = { attemptId: crypto.randomUUID() };
  sessionStorage.setItem('finzero_pending_dispatch', JSON.stringify(next));
  return next;
}

export function WhatsAppRedirect() {
  const [request] = useState(pendingDispatch);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [target, setTarget] = useState('');
  const [webTarget, setWebTarget] = useState('');

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setError('');
    setTarget('');
    setWebTarget('');
    (async () => {
      try {
        const result = await distributeLead(request.attemptId, request.returnPath === '/kw' ? 'pagina_kw' : 'pagina_redirecionando');
        if (cancelled) return;
        if (!result.success || !result.attendant) {
          setError(result.code === 'NO_ACTIVE_ATTENDANTS'
            ? 'Nenhum atendente está disponível agora. Tente novamente em alguns instantes.'
            : 'Não foi possível conectar ao atendimento. Tente novamente.');
          return;
        }
        const digits = result.attendant.phone.replace(/\D/g, '');
        const phone = digits.length === 10 || digits.length === 11 ? '55' + digits : digits;
        if (!/^[0-9]{10,15}$/.test(phone)) throw new Error('Número inválido');
        const amount = Number(request.amount);
        const message = Number.isFinite(amount) && amount >= 1000 && amount <= 50000
          ? 'Olá! Tenho interesse em um empréstimo de ' + formatCurrency(amount) + ' e gostaria de saber mais.'
          : 'Olá! Tenho interesse em um empréstimo e gostaria de saber mais.';
        const webUrl = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
        const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const url = mobile ? 'whatsapp://send?phone=' + phone + '&text=' + encodeURIComponent(message) : webUrl;
        setTarget(url);
        setWebTarget(webUrl);
        timer = setTimeout(() => {
          if (!cancelled) {
            if (mobile) window.location.assign(url);
            else window.location.replace(url);
          }
        }, 150);
      } catch {
        if (!cancelled) setError('Não foi possível conectar ao atendimento. Verifique sua conexão e tente novamente.');
      }
    })();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [request, retry]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-5 py-12">
      <section className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center" aria-live="polite" aria-busy={!error && !target}>
        <div className="mx-auto mb-7 w-14 h-14 bg-[#05BCB4] rounded-2xl text-white font-black text-3xl flex items-center justify-center">F</div>
        {error ? <AlertTriangle className="mx-auto mb-5 w-12 h-12 text-amber-500" /> : <Loader2 className="mx-auto mb-5 w-12 h-12 text-[#05BCB4] animate-spin" />}
        <h1 className="text-2xl font-extrabold text-slate-900">{error ? 'Atendimento indisponível' : 'Conectando você a um atendente'}</h1>
        <p className="mt-3 text-sm text-slate-600">{error || (target ? 'Tudo pronto! Abrindo o WhatsApp...' : 'Aguarde um instante. Estamos buscando o próximo atendente disponível.')}</p>
        {error && <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-6 w-full rounded-xl bg-[#05BCB4] px-5 py-3 text-white font-bold">Tentar novamente</button>}
        {target && <a href={target} className="mt-6 block w-full rounded-xl bg-[#05BCB4] px-5 py-3 text-white font-bold">Abrir WhatsApp</a>}
        {target && <p className="mt-3 text-xs text-slate-500">Se o aplicativo não abrir automaticamente, toque no botão acima ou <a href={webTarget} className="underline">continue pelo link do WhatsApp</a>.</p>}
        <a href={(request.returnPath === '/kw' ? '/kw' : '/') + '#simulador'} className="mt-6 inline-block text-sm text-slate-500 underline">Voltar ao site</a>
      </section>
    </main>
  );
}
