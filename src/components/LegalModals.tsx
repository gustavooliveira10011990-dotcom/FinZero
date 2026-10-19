import React from 'react';
import { X, ShieldAlert, FileText, Lock } from 'lucide-react';

export type LegalModalType = 'termos' | 'privacidade' | 'seguranca' | null;

interface LegalModalsProps {
  type: LegalModalType;
  onClose: () => void;
}

export const LegalModals: React.FC<LegalModalsProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            {type === 'termos' && <FileText className="w-5 h-5 text-[#05BCB4]" />}
            {type === 'privacidade' && <Lock className="w-5 h-5 text-[#05BCB4]" />}
            {type === 'seguranca' && <ShieldAlert className="w-5 h-5 text-[#05BCB4]" />}
            <span>
              {type === 'termos' && 'Termos e Condições de Uso'}
              {type === 'privacidade' && 'Política de Privacidade e Proteção de Dados (LGPD)'}
              {type === 'seguranca' && 'Alerta de Segurança'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto text-xs sm:text-sm text-slate-600 space-y-4 leading-relaxed">
          {type === 'termos' && (
            <>
              <p className="font-semibold text-slate-900">
                1. Natureza dos Serviços
              </p>
              <p>
                A Finzero é uma plataforma digital que conecta clientes interessados em soluções de crédito às instituições financeiras parceiras. Não somos uma instituição bancária ou credor direto, não concedendo crédito com recursos próprios.
              </p>
              <p>
                Nossa atividade restringe-se à apresentação de clientes e encaminhamento de solicitações para análise e concessão exclusiva pelas instituições parceiras.
              </p>

              <p className="font-semibold text-slate-900">
                2. Gratuidade para o Usuário
              </p>
              <p>
                O uso da plataforma Finzero para simulação e solicitação é totalmente gratuito para o consumidor. A remuneração da plataforma ocorre exclusivamente pelas instituições financeiras contratantes parceiras, sem qualquer custo adicional embutido ao tomador de crédito.
              </p>

              <p className="font-semibold text-slate-900">
                3. Condições de Pagamento e CET
              </p>
              <p>
                Os prazos de parcelamento variam de 6 a 120 meses. As taxas de juros nominais e o Custo Efetivo Total (CET) variam de 1,49% ao mês (19,56% a.a.) até 7,49% ao mês (138,2% a.a.), dependendo da análise de risco de crédito, perfil cadastral e convênio financeiro selecionado pelo usuário.
              </p>
            </>
          )}

          {type === 'privacidade' && (
            <>
              <p className="font-semibold text-slate-900">
                1. Compromisso com a Lei Geral de Proteção de Dados (LGPD)
              </p>
              <p>
                A Finzero preza pela máxima confidencialidade e segurança das informações pessoais de seus usuários em total conformidade com a Lei nº 13.709/2018 (LGPD).
              </p>

              <p className="font-semibold text-slate-900">
                2. Finalidade da Coleta de Dados
              </p>
              <p>
                Os dados cadastrais solicitados (como Nome, CPF, Telefone, E-mail, Renda e Ocupação) são coletados exclusivamente para a finalidade de realizar a simulação de empréstimo e a verificação prévia de elegibilidade junto aos correspondentes bancários e financeiras parceiras.
              </p>

              <p className="font-semibold text-slate-900">
                3. Compartilhamento Seguro
              </p>
              <p>
                Os dados são transmitidos utilizando criptografia de ponta a ponta (SSL 256-bit) e são compartilhados unicamente com os bureaus de crédito autorizados e as instituições financeiras parceiras envolvidas na operação de crédito solicitada pelo titular. Não vendemos seus dados para terceiros de publicidade não autorizada.
              </p>
            </>
          )}

          {type === 'seguranca' && (
            <>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                <p className="font-bold">
                  ATENÇÃO: NUNCA PAGUE NENHUM VALOR ADIANTADO!
                </p>
                <p>
                  A legislação brasileira proíbe expressamente a cobrança de qualquer quantia antecipada para conceder empréstimos. Golpistas frequentemente se passam por financeiras exigindo taxas para:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>"Taxa de avalista ou fiador"</li>
                  <li>"Liberação de score no SPC/Serasa"</li>
                  <li>"Desbloqueio de contrato ou IOF adiantado"</li>
                  <li>"Taxa de cartório ou certificação digital"</li>
                </ul>
              </div>

              <p>
                A Finzero repudia veementemente qualquer tentativa de golpe e informa que todos os procedimentos oficiais ocorrem diretamente nos canais credenciados, onde nenhuma cobrança antecipada é requerida do consumidor. Caso receba mensagens suspeitas, interrompa o contato e denuncie às autoridades policiais competentes.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
