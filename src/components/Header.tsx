import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';

interface HeaderProps {
  onStartSimulation: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onStartSimulation }) => {
  return (
    <>
      {/* Main Navigation - Strict 3-Zone Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 h-16">
          {/* Zone 1: Standalone F Logo */}
          <a href="#" className="flex items-center whitespace-nowrap shrink-0 group" aria-label="Finzero Início">
            <div className="w-10 h-10 rounded-2xl bg-[#05BCB4] flex items-center justify-center text-white font-black text-2xl shadow-md shadow-[#05BCB4]/25 group-hover:bg-[#04A69F] group-hover:scale-105 active:scale-95 transition-all">
              F
            </div>
          </a>

          {/* Zone 2: 4 Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#simulador" className="hover:text-[#05BCB4] transition-colors whitespace-nowrap shrink-0">
              Simulador
            </a>
            <a href="#como-funciona" className="hover:text-[#05BCB4] transition-colors whitespace-nowrap shrink-0">
              Como Funciona
            </a>
            <a href="#beneficios" className="hover:text-[#05BCB4] transition-colors whitespace-nowrap shrink-0">
              Vantagens
            </a>
            <a href="#duvidas" className="hover:text-[#05BCB4] transition-colors whitespace-nowrap shrink-0">
              Dúvidas
            </a>
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onStartSimulation}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#05BCB4] hover:bg-[#04A69F] active:scale-95 transition-all rounded-xl shadow-md shadow-[#05BCB4]/25 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Simular Agora</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
