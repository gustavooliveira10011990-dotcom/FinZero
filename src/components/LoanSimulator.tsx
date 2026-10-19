import React, { useState } from 'react';
import { formatCurrency } from '../utils/formatters';
import { ArrowRight, Lock, Zap } from 'lucide-react';

interface LoanSimulatorProps {
  onApply: (amount: number, months: number) => void;
}

const PRESET_AMOUNTS = [3000, 5000, 10000, 20000, 30000, 40000, 50000];

export const LoanSimulator: React.FC<LoanSimulatorProps> = ({ onApply }) => {
  const [amount, setAmount] = useState<number>(5000);
  const months = 24;

  return (
    <div id="simulador" className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
      {/* Header of card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6 border-b border-slate-100">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#05BCB4]">Simulador Gratuito</span>
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

      {/* Action Button */}
      <div className="pt-5 border-t border-slate-100 space-y-3">
        <button
          type="button"
          onClick={() => onApply(amount, months)}
          className="w-full py-4 px-6 bg-[#05BCB4] hover:bg-[#04A69F] active:scale-[0.99] text-white font-extrabold text-base rounded-2xl transition-all shadow-lg shadow-[#05BCB4]/25 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Solicitar Empréstimo</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Simulação gratuita · Sem consulta prévia ao SPC/Serasa</span>
        </div>
      </div>
    </div>
  );
};
