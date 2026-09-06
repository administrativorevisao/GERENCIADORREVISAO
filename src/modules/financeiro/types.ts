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
  departmentId: string | null;
  counterparty: string;
  description: string;
  projectId: string | null;
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
