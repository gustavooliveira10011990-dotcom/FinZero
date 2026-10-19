import React from 'react';
import { Sliders, SearchCheck, CheckCircle2 } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Simule o Valor Desejado',
      desc: 'Escolha o valor de R$ 1.000 a R$ 50.000 e o número de parcelas que cabe com folga no seu bolso.',
      icon: Sliders,
    },
    {
      num: '02',
      title: 'Comparação Inteligente',
      desc: 'Nosso sistema busca as melhores propostas e taxas entre dezenas de instituições financeiras parceiras credenciadas.',
      icon: SearchCheck,
    },
    {
      num: '03',
      title: 'Dinheiro na Conta via PIX',
      desc: 'Após a aprovação e assinatura digital 100% segura, o crédito é transferido direto para sua conta bancária.',
      icon: CheckCircle2,
    },
  ];

  return (
    <section id="como-funciona" className="py-16 sm:py-24 bg-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-[#05BCB4]">
            Processo Simples e Rápido
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
            Como solicitar seu empréstimo na Finzero
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-3">
            Tudo pelo celular ou computador, sem filas, sem papelada e com total transparência.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="relative bg-slate-50/70 rounded-2xl border border-slate-200/80 p-8 hover:border-[#05BCB4]/50 transition-all group"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#05BCB4]/15 text-[#03827C] flex items-center justify-center font-bold group-hover:bg-[#05BCB4] group-hover:text-white transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-3xl font-black text-slate-300 tabular-nums">
                    {step.num}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
