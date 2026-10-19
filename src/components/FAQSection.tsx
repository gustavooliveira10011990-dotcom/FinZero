import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Quem está negativado no SPC ou Serasa pode solicitar empréstimo?',
      a: 'Sim! Possuímos parcerias com diversas instituições financeiras que oferecem linhas de crédito com análise diferenciada para negativados, incluindo empréstimo consignado, empréstimo com garantia e linhas com débito na conta de luz ou em conta corrente.',
    },
    {
      q: 'A simulação na Finzero tem algum custo?',
      a: 'Não! A simulação e o envio da sua proposta em nosso site são 100% gratuitos para você. Nós conectamos seu pedido diretamente às financeiras parceiras.',
    },
    {
      q: 'Em quanto tempo o dinheiro é liberado na minha conta?',
      a: 'Após a aprovação do seu cadastro e a assinatura digital do contrato oficial pelo seu celular, os recursos são creditados em sua conta corrente, poupança ou chave PIX no mesmo dia ou em até 24 horas úteis.',
    },
    {
      q: 'Quais são os requisitos mínimos para solicitar?',
      a: 'Ter no mínimo 18 anos completos, possuir CPF regular perante a Receita Federal, comprovante de residência atualizado e possuir uma conta bancária de sua titularidade.',
    },
    {
      q: 'O que é o Custo Efetivo Total (CET)?',
      a: 'O CET é a taxa percentual que representa a soma de todas as despesas e encargos do empréstimo (juros, IOF, seguros e tributos). Na Finzero, todas as propostas apresentam o CET detalhado de maneira transparente antes de qualquer assinatura.',
    },
    {
      q: 'Como funciona a Finzero?',
      a: 'A Finzero é uma plataforma online que conecta clientes interessados em crédito às financeiras parceiras, agilizando a apresentação da proposta ideal para o seu perfil.',
    },
  ];

  return (
    <section id="duvidas" className="py-16 sm:py-24 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-[#05BCB4]">
            Tire Suas Dúvidas
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
            Perguntas Frequentes
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-3">
            Tudo o que você precisa saber sobre prazos, taxas e funcionamento do serviço.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden transition-all shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left cursor-pointer focus:outline-none"
                >
                  <span className="text-sm sm:text-base font-bold text-slate-900 pr-4">
                    {faq.q}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 bg-[#05BCB4]/20 text-[#03827C]' : ''
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
