import React from 'react';
import { ShieldCheck, Lock, Building, Mail, Phone } from 'lucide-react';
import { LegalModalType } from './LegalModals';

interface FooterProps {
  onOpenLegalModal: (type: LegalModalType) => void;
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLegalModal, onOpenAdmin }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800">
      {/* Top Footer with Brand and Trust Badges */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          {/* Brand info */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#05BCB4] flex items-center justify-center text-white font-black text-xl shadow-sm">
                F
              </div>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md leading-relaxed">
              Plataforma digital especializada na simulação, comparação e geração de oportunidades de crédito online com agilidade, transparência e segurança.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 text-slate-300 text-xs">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#05BCB4]" />
                Criptografia SSL 256 bits
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-[#05BCB4]" />
                Em conformidade com a LGPD
              </span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Navegação
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#simulador" className="hover:text-white transition-colors">
                  Simulador de Crédito
                </a>
              </li>
              <li>
                <a href="#como-funciona" className="hover:text-white transition-colors">
                  Como Funciona
                </a>
              </li>
              <li>
                <a href="#beneficios" className="hover:text-white transition-colors">
                  Vantagens e Benefícios
                </a>
              </li>
              <li>
                <a href="#duvidas" className="hover:text-white transition-colors">
                  Dúvidas Frequentes
                </a>
              </li>
            </ul>
          </div>

          {/* Legal and compliance links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Políticas e Segurança
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegalModal('termos')}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Termos de Uso
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegalModal('privacidade')}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Política de Privacidade (LGPD)
                </button>
              </li>
              <li>
                <a
                  href="/painel"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onOpenAdmin) onOpenAdmin();
                    else window.location.href = '/painel';
                  }}
                  className="hover:text-slate-300 text-slate-500 transition-colors text-left cursor-pointer flex items-center gap-1 text-[11px]"
                  title="Área restrita de gestão de atendentes"
                >
                  <Lock className="w-3 h-3 text-[#05BCB4]" />
                  <span>Painel de Atendentes</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 
          Discreet Lead Generator & Kwai Ads Compliance Section:
          Rendered neatly in a muted, non-intrusive container at the bottom.
        */}
        <div className="pt-8 space-y-3 text-[10px] leading-relaxed text-slate-600 selection:text-slate-400">
          <p>
            A Finzero é uma plataforma digital de geração de oportunidades e conexão financeira que apresenta clientes interessados em crédito a instituições financeiras parceiras credenciadas. Não somos instituição financeira, banco ou credores diretos e não realizamos empréstimos com recursos próprios. As análises e aprovações de crédito são de competência exclusiva das financeiras parceiras.
          </p>

          <p>
            Aviso: A Finzero não cobra nenhuma taxa ou depósito antecipado para solicitação ou liberação de crédito.
          </p>

          <p>
            Exemplo representativo: Empréstimo de R$ 5.000,00 para pagamento em 24 parcelas de R$ 268,40. Custo Efetivo Total (CET) estimado de 1,99% a.m. (26,68% a.a.). Valor total: R$ 6.441,60. IOF incluso: R$ 138,50. Prazos: 6 a 120 meses. Taxas nominais: 1,49% a.m. a 7,49% a.m. (19,56% a 138,2% a.a.). A aprovação de crédito depende da política da financeira parceira.
          </p>

          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500">
            <div>
              © {new Date().getFullYear()} Finzero. Todos os direitos reservados. CNPJ 42.189.512/0001-83.
            </div>
            <div className="flex items-center gap-4">
              <span>Atendimento: seg a sex das 09h às 18h</span>
              <span>·</span>
              <span>Brasil</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
