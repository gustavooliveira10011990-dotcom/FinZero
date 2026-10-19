import marianaAvatar from '../assets/images/finzero_avatar_mariana_1792369145952.jpg';
import carlosAvatar from '../assets/images/finzero_avatar_carlos_1792369146151.jpg';
import React from 'react';
import { Star, CheckCircle } from 'lucide-react';

export const Testimonials: React.FC = () => {
  const reviews = [
    {
      name: 'Mariana Siqueira',
      city: 'Campinas, SP',
      role: 'Microempreendedora',
      avatar: marianaAvatar,
      text: 'Estava negativada e precisava de R$ 7.500 para repor o estoque da minha loja. Fiz a simulação na Finzero e em menos de 24h o valor caiu via PIX na minha conta!',
      amount: 'R$ 7.500 liberados',
    },
    {
      name: 'Carlos Eduardo Mendes',
      city: 'Belo Horizonte, MG',
      role: 'Motorista de Aplicativo',
      avatar: carlosAvatar,
      text: 'O que mais gostei foi a facilidade. A simulação foi simples, fui conectado com uma ótima opção e o valor foi direto para minha conta bancária.',
      amount: 'R$ 4.000 liberados',
    },
    {
      name: 'Luciana Ferreira',
      city: 'Curitiba, PR',
      role: 'Auxiliar Administrativo',
      avatar: '', // fallback demonstration
      text: 'Consegui unificar todas as minhas dívidas de cartão de crédito em uma única parcela mensal com juros bem menores. A equipe me atendeu super rápido pelo WhatsApp!',
      amount: 'R$ 12.000 liberados',
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-[#05BCB4]">
            Histórias Reais
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
            Quem simulou e aprovou com a Finzero
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-3">
            Milhares de brasileiros já encontraram as melhores condições de crédito através da nossa plataforma.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((r, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div>
                {/* Rating stars */}
                <div className="flex items-center gap-1 text-amber-500 mb-4">
                  {[...Array(5)].map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-amber-500 text-amber-500" />
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-1">5.0</span>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed italic mb-6">
                  "{r.text}"
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {r.avatar ? (
                    <img
                      src={r.avatar}
                      alt={r.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-sm"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[#05BCB4] text-white font-bold flex items-center justify-center text-sm shadow-sm">
                      {r.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-bold text-slate-900">{r.name}</div>
                    <div className="text-xs text-slate-500">{r.city}</div>
                  </div>
                </div>

                <span className="text-[11px] font-semibold text-[#03827C] bg-[#05BCB4]/15 px-2.5 py-1 rounded-md">
                  {r.amount}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
