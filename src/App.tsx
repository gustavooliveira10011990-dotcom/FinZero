// Rota pública de conexão com atendentes.
import heroImage from './assets/images/finzero_hero_happy_1792369144689.jpg';
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LoanSimulator, WhatsAppRedirect } from './components/LoanSimulator';
import { HowItWorks } from './components/HowItWorks';
import { Benefits } from './components/Benefits';
import { Testimonials } from './components/Testimonials';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { LegalModals, LegalModalType } from './components/LegalModals';
import { AdminPanel } from './components/AdminPanel';
import { 
  ShieldCheck, 
  Zap, 
  CheckCircle2,
  MessageCircle 
} from 'lucide-react';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  });

  const [legalModalType, setLegalModalType] = useState<LegalModalType>(null);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollToSimulator = () => {
    const element = document.getElementById('simulador');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (currentPath === '/redirecionando' || currentPath === '/redirecionando/') {
    return <WhatsAppRedirect />;
  }

  // ROTA /painel: Acesso direto com fallback SPA do Cloudflare Pages
  if (currentPath === '/painel' || currentPath.startsWith('/painel/')) {
    return <AdminPanel onBackToSite={() => navigate('/')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Header */}
      <Header onStartSimulation={handleScrollToSimulator} />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-8 pb-16 lg:py-16 bg-gradient-to-b from-white via-slate-50 to-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              
              {/* Left Column on Desktop / Main flow on Mobile */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                {/* Clean inline trust indicator */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#03827C]">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-[#05BCB4]" />
                    Simulação 100% Online e Gratuita
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span>Resposta em Minutos</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span>Sem Burocracia</span>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15] text-balance">
                    Empréstimo Rápido, 100% Online e Sem Burocracia
                  </h1>

                  <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                    Simule de <strong className="text-slate-900">R$ 1 mil até 50 mil</strong> com taxas a partir de <strong className="text-[#03827C]">1,49% ao mês</strong>. Receba propostas em minutos direto no WhatsApp, mesmo se estiver negativado.
                  </p>
                </div>

                {/* Mobile-First Placement: On Mobile (< lg), LoanSimulator is right here 'na cara do gol' */}
                <div className="block lg:hidden w-full">
                  <LoanSimulator />
                </div>

                {/* Hero Editorial Photography Container */}
                <div className="relative rounded-3xl overflow-hidden border border-slate-200/90 shadow-md aspect-video max-w-xl group">
                  <img
                    src={heroImage}
                    alt="Cliente Finzero satisfeita com a liberação rápida do empréstimo"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-5 text-white">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#05BCB4] mb-1">
                      <Zap className="w-4 h-4 fill-[#05BCB4] text-[#05BCB4]" />
                      <span>Liberação Rápida via PIX</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-100">
                      Dinheiro direto na sua conta bancária após aprovação digital.
                    </div>
                  </div>
                </div>

                {/* Key Highlights list */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 max-w-xl text-xs sm:text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#05BCB4] shrink-0" />
                    <span>Processo 100% Digital</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#05BCB4] shrink-0" />
                    <span>Aceita negativados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#05BCB4] shrink-0" />
                    <span>Parcelas em até 120x</span>
                  </div>
                </div>
              </div>

              {/* Desktop Column: Interactive Loan Simulator (Sticky alongside hero) */}
              <div className="hidden lg:block lg:col-span-5 sticky top-24">
                <LoanSimulator />
              </div>

            </div>

            {/* Metric Strip Below Hero */}
            <div className="mt-14 pt-8 border-t border-slate-200/80 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
                  1,49% <span className="text-xs text-slate-500 font-normal">a.m.</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 font-medium">Taxas iniciais competitivas</div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
                  Até R$ 50k
                </div>
                <div className="text-xs text-slate-500 mt-1 font-medium">Limite pré-aprovado</div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
                  24 horas
                </div>
                <div className="text-xs text-slate-500 mt-1 font-medium">Crédito transferido via PIX</div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#05BCB4] tabular-nums">
                  R$ 0,00
                </div>
                <div className="text-xs text-slate-500 mt-1 font-medium">Simulação 100% gratuita</div>
              </div>
            </div>

          </div>
        </section>

        {/* HOW IT WORKS */}
        <HowItWorks />

        {/* BENEFITS */}
        <Benefits />

        {/* TESTIMONIALS */}
        <Testimonials />

        {/* FAQ */}
        <FAQSection />
      </main>

      {/* FOOTER with Discrete Intermediary Disclaimer & Kwai Ads Compliance */}
      <Footer 
        onOpenLegalModal={setLegalModalType} 
        onOpenAdmin={() => navigate('/painel')} 
      />

      {/* LEGAL & COMPLIANCE MODALS (Terms, Privacy LGPD, Anti-Fraud) */}
      <LegalModals
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />

      {/* Floating Mobile CTA ("Na cara do gol" para celular) */}
      <aside aria-label="Ação rápida no celular" className="md:hidden fixed bottom-3 left-3 right-3 z-30 pointer-events-none">
        <a
          href="#simulador"
          className="pointer-events-auto w-full py-3 px-4 bg-gradient-to-r from-[#05BCB4] to-[#04A69F] text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-[#05BCB4]/40 flex items-center justify-between border border-white/25 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4 fill-white text-white" />
            </div>
            <span className="truncate">Simular e Pedir no WhatsApp</span>
          </div>
        </a>
      </aside>
    </div>
  );
}
