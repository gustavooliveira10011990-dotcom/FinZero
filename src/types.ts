export interface LoanSimulation {
  amount: number;
  months: number;
  monthlyRate: number; // e.g. 0.0149 (1.49%)
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  cetAnnual: number;
}

export type LoanPurpose = 
  | 'dividas'
  | 'reforma'
  | 'capital_giro'
  | 'veiculo'
  | 'pessoal'
  | 'emergencia';

export type EmploymentType =
  | 'clt'
  | 'autonomo'
  | 'servidor'
  | 'aposentado_inss'
  | 'empresario';

export interface ApplicationFormData {
  amount: number;
  months: number;
  purpose: LoanPurpose;
  fullName: string;
  cpf: string;
  birthDate: string;
  phone: string;
  email: string;
  cep: string;
  employmentType: EmploymentType;
  monthlyIncome: string;
  isNegativado: 'sim' | 'nao';
  bankAccountType: 'corrente' | 'poupanca' | 'pix';
  pixKeyType?: 'cpf' | 'telefone' | 'email' | 'aleatoria';
}

export interface PartnerBank {
  name: string;
  logoText: string;
  tag: string;
  interestRate: string;
  approvalSpeed: string;
  scoreMatch: string;
}
