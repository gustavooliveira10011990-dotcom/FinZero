import React from 'react';
import { ShieldCheck, UserCheck, Zap, Percent, Clock, BadgePercent } from 'lucide-react';

export const Benefits: React.FC = () => {
  const benefits = [
    {
      title: 'Simulação Rápida e Fácil',
      desc: 'Conectamos sua solicitação diretamente às financeiras parceiras com maior chance de aprovação para o seu perfil.',
      icon: ShieldCheck,
      highlight: true,
    },
    {
      title: 'Crédito Para Negativados',
      desc: 'Parceiros com linhas exclusivas de crédito que aceitam pessoas com restrições cadastrais no SPC ou Serasa.',
      icon: UserCheck,
      highlight: false,
    },
    {
      title: 'Taxas a partir de 1,49% a.m.',
      desc: 'Comparamos múltiplos parceiros para você ter acesso às menores taxas de juros disponíveis.',
      icon: Percent,
      highlight: false,
    },
    {
      title: 'Liberação Expressa via PIX',
      desc: 'Após aprovado, o valor é depositado na sua conta corrente, poupança ou chave PIX em até 24 horas úteis.',
      icon: Zap,
      highlight: false,
    },
    {
      title: '100% Digital e Seguro',
      desc: 'Solicite e assine seu contrato pelo celular em qualquer lugar do Brasil, com proteção total de dados (LGPD).',
      icon: Clock,
      highlight: false,
    },
    {
      title: 'Parcelas em até 120 vezes',
      desc: 'Prazos flexíveis de até 120 meses para planejar pagamentos que não comprometem seu orçamento familiar.',
      icon: BadgePercent,
      highlight: false,
    },
  ];

  return (
    <section id="beneficios" className="py-16 sm:py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-[#05BCB4]">
            Por que escolher a Finzero
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
            Vantagens pensadas para o seu momento financeiro
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-3">
            Conectamos você com agilidade às melhores ofertas e oportunidades de crédito do mercado.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b, idx) => {
            const Icon = b.icon;
            return (
              <div
                key={idx}
                className={`p-7 rounded-2xl border transition-all ${
                  b.highlight
                    ? 'bg-[#0b1e28] text-white border-[#05BCB4]/30 shadow-lg shadow-[#05BCB4]/5'
                    : 'bg-white text-slate-900 border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${
                    b.highlight
                      ? 'bg-[#05BCB4]/20 text-[#05BCB4]'
                      : 'bg-[#05BCB4]/10 text-[#03827C]'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3
                  className={`text-lg font-bold mb-2 ${
                    b.highlight ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {b.title}
                </h3>
                <p
                  className={`text-sm leading-relaxed ${
                    b.highlight ? 'text-emerald-100/90' : 'text-slate-600'
                  }`}
                >
                  {b.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
