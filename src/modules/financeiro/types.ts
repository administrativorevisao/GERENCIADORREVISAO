export const FIN_VIEWS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "fluxoCaixa", label: "Fluxo de Caixa" },
  { id: "contas", label: "Contas a Pagar/Receber" },
  { id: "faturamento", label: "Faturamento" },
  { id: "contasBancarias", label: "Contas Bancárias" },
  { id: "folha", label: "Folha de Pagamento" },
  { id: "nfsContratados", label: "NFs de Contratados" },
  { id: "metas", label: "Metas Financeiras" },
  { id: "dre", label: "DRE" },
] as const;
export type FinViewId = (typeof FIN_VIEWS)[number]["id"];

export type DreGroup = "receitaBruta" | "deducoes" | "custos" | "despesasOperacionais";
export const DRE_GROUPS: Record<DreGroup, string> = {
  receitaBruta: "Receita Bruta",
  deducoes: "Deduções",
  custos: "Custos",
  despesasOperacionais: "Despesas Operacionais",
};

export type FinTxnStatus = "pendente" | "pago" | "cancelado";
export const FIN_TXN_STATUS: Record<FinTxnStatus, string> = {
  pendente: "Pendente",
  pago: "Pago",
  cancelado: "Cancelado",
};

// Autorização do CEO (ou outro admin) antes de uma despesa poder ser paga —
// só se aplica a contas a pagar criadas manualmente; lançamentos vindos da
// sincronização do razão bancário (já executados, histórico) entram
// aprovados direto, pois não há o que autorizar num gasto que já aconteceu.
export type ApprovalStatus = "pendente" | "aprovado" | "rejeitado";
export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  pendente: "Aguardando aprovação",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

// O fluxo de aprovação do CEO só vale de verdade a partir desta data — tudo
// com vencimento anterior é dado histórico (já reconciliado no DRE) e entra
// (ou é corrigido, se já existia) como aprovado e pago direto, sem passar
// pelo Terminal.
export const APPROVAL_CUTOFF_DATE = "2026-09-17";

export interface FinanceTxn {
  id: string;
  type: "receita" | "despesa";
  status: FinTxnStatus;
  dueDate: string;
  paidDate: string | null;
  competenceMonth: string; // "YYYY-MM"
  amount: number;
  accountId: string | null;
  dreGroup: DreGroup;
  category: string;
  detail: string;
  departmentId: string | null;
  counterparty: string;
  description: string;
  projectId: string | null;
  isFixed: boolean;
  // Só relevante quando isFixed=true: separa assinaturas recorrentes de
  // baixo risco (ex: SaaS — pré-aprovadas, não passam pelo Terminal) de
  // contas fixas mensais maiores (ex: aluguel) que devem sempre ser
  // aprovadas de novo a cada mês. Despesas variáveis (isFixed=false)
  // sempre exigem aprovação, independente deste campo.
  requiresApproval: boolean;
  approvalStatus: ApprovalStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  sourceType: "manual" | "invoice" | "payroll" | "contractorInvoice";
  sourceId: string | null;
  sourceSheetLinkId?: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceAccount {
  id: string;
  name: string;
  bank: string;
  type: "corrente" | "poupanca" | "caixa" | "investimento";
  openingBalance: number;
  openingDate: string;
  notes: string;
  active: boolean;
  sourceSheetLinkId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Saldo observado de uma conta bancária numa data específica — vem de
// relatórios reais que trazem histórico de saldo diário (ex: VND, com
// aba "Histórico de Saldos Diários") em vez de uma lista de contas com saldo
// inicial. accountBalance() usa o snapshot mais recente até a data pedida
// como base e soma só os lançamentos pagos depois dele.
export interface FinanceAccountBalance {
  id: string;
  accountId: string;
  date: string; // "YYYY-MM-DD"
  balance: number;
  sourceSheetLinkId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PayableStatus = "pendente" | "paga" | "cancelada";

export interface FinanceInvoice {
  id: string;
  clientName: string;
  projectId: string | null;
  number: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  status: PayableStatus;
  paidDate: string | null;
  accountId: string | null;
  description: string;
  linkedTxnId: string | null;
  sourceSheetLinkId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinancePayroll {
  id: string;
  userId: string | null;
  competenceMonth: string;
  baseSalary: number;
  benefits: number;
  deductions: number;
  dueDate: string;
  status: "pendente" | "pago";
  paidDate: string | null;
  accountId: string | null;
  notes: string;
  linkedTxnId: string | null;
  sourceSheetLinkId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceContractorInvoice {
  id: string;
  userId: string | null;
  contractorName: string;
  competenceMonth: string;
  nfNumber: string;
  amount: number;
  dueDate: string;
  status: PayableStatus;
  receivedDate: string | null;
  paidDate: string | null;
  accountId: string | null;
  notes: string;
  linkedTxnId: string | null;
  sourceSheetLinkId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type GoalMetric = "receita" | "despesa" | "lucro";

export interface FinanceGoal {
  id: string;
  period: string; // "YYYY-MM"
  periodType: "month";
  metricType: GoalMetric;
  targetAmount: number;
  departmentId: string | null;
  notes: string;
  sourceSheetLinkId?: string | null;
  createdAt: string;
  updatedAt: string;
}
