import { createRow, listRows, newId, updateRow } from "../../shared/lib/jsonStore";
import { todayISO } from "../../shared/lib/dates";
import type {
  FinanceAccount, FinanceContractorInvoice, FinanceGoal, FinanceInvoice, FinancePayroll, FinanceTxn,
} from "./types";

const T = {
  txns: "finance_transactions",
  accounts: "finance_accounts",
  invoices: "finance_invoices",
  payroll: "finance_payroll",
  contractorInvoices: "finance_contractor_invoices",
  goals: "finance_goals",
};

// ---- Lançamentos (ledger) ----
export const listTxns = (companyId: string) => listRows<FinanceTxn>(T.txns, companyId);

export function createTxn(companyId: string, input: Partial<FinanceTxn>) {
  const now = new Date().toISOString();
  const txn: FinanceTxn = {
    id: newId("fx"), type: "despesa", status: "pendente", dueDate: todayISO(), paidDate: null,
    competenceMonth: todayISO().slice(0, 7), amount: 0, accountId: null, dreGroup: "despesasOperacionais",
    category: "", departmentId: null, counterparty: "", description: "", projectId: null,
    sourceType: "manual", sourceId: null, notes: "", createdAt: now, updatedAt: now, ...input,
  };
  return createRow(T.txns, companyId, txn);
}

export function updateTxn(txn: FinanceTxn) {
  return updateRow(T.txns, { ...txn, updatedAt: new Date().toISOString() });
}

async function linkTxn(
  companyId: string,
  sourceType: FinanceTxn["sourceType"],
  sourceId: string,
  fields: Partial<FinanceTxn>,
  existingLinkedTxnId: string | null,
  existingTxns: FinanceTxn[],
): Promise<string> {
  const existing = existingLinkedTxnId ? existingTxns.find((t) => t.id === existingLinkedTxnId) : null;
  if (existing) {
    await updateTxn({ ...existing, ...fields, sourceType, sourceId });
    return existing.id;
  }
  const created = await createTxn(companyId, { ...fields, sourceType, sourceId });
  return created.id;
}

// ---- Contas bancárias ----
export const listAccounts = (companyId: string) => listRows<FinanceAccount>(T.accounts, companyId);

export function createAccount(companyId: string, input: Partial<FinanceAccount>) {
  const now = new Date().toISOString();
  const account: FinanceAccount = {
    id: newId("facc"), name: "", bank: "", type: "corrente", openingBalance: 0, openingDate: todayISO(),
    notes: "", active: true, createdAt: now, updatedAt: now, ...input,
  };
  return createRow(T.accounts, companyId, account);
}

export function updateAccount(account: FinanceAccount) {
  return updateRow(T.accounts, { ...account, updatedAt: new Date().toISOString() });
}

export function accountBalance(account: FinanceAccount, txns: FinanceTxn[], asOfDate = todayISO()): number {
  const paid = txns.filter((t) => t.accountId === account.id && t.status === "pago" && (t.paidDate ?? "") <= asOfDate);
  const delta = paid.reduce((sum, t) => sum + (t.type === "receita" ? t.amount : -t.amount), 0);
  return account.openingBalance + delta;
}

export function cashPosition(accounts: FinanceAccount[], txns: FinanceTxn[], asOfDate = todayISO()): number {
  return accounts.filter((a) => a.active).reduce((sum, a) => sum + accountBalance(a, txns, asOfDate), 0);
}

// ---- Faturamento ----
export const listInvoices = (companyId: string) => listRows<FinanceInvoice>(T.invoices, companyId);

export function createInvoice(companyId: string, input: Partial<FinanceInvoice>) {
  const now = new Date().toISOString();
  const invoice: FinanceInvoice = {
    id: newId("finv"), clientName: "", projectId: null, number: "", issueDate: todayISO(), dueDate: todayISO(),
    amount: 0, status: "pendente", paidDate: null, accountId: null, description: "", linkedTxnId: null,
    createdAt: now, updatedAt: now, ...input,
  };
  return createRow(T.invoices, companyId, invoice);
}

export function updateInvoice(invoice: FinanceInvoice) {
  return updateRow(T.invoices, { ...invoice, updatedAt: new Date().toISOString() });
}

export async function markInvoicePaid(companyId: string, invoice: FinanceInvoice, accountId: string, paidDate: string, existingTxns: FinanceTxn[]) {
  const linkedTxnId = await linkTxn(companyId, "invoice", invoice.id, {
    type: "receita", status: "pago", dueDate: invoice.dueDate, paidDate,
    competenceMonth: paidDate.slice(0, 7), amount: invoice.amount, accountId, dreGroup: "receitaBruta",
    category: "Faturamento", counterparty: invoice.clientName, projectId: invoice.projectId,
    description: `Fatura ${invoice.number || invoice.id}`,
  }, invoice.linkedTxnId, existingTxns);
  return updateInvoice({ ...invoice, status: "paga", paidDate, accountId, linkedTxnId });
}

// ---- Folha de pagamento ----
export const listPayroll = (companyId: string) => listRows<FinancePayroll>(T.payroll, companyId);

export function createPayroll(companyId: string, input: Partial<FinancePayroll>) {
  const now = new Date().toISOString();
  const payroll: FinancePayroll = {
    id: newId("fpay"), userId: null, competenceMonth: todayISO().slice(0, 7), baseSalary: 0, benefits: 0,
    deductions: 0, dueDate: todayISO(), status: "pendente", paidDate: null, accountId: null, notes: "",
    linkedTxnId: null, createdAt: now, updatedAt: now, ...input,
  };
  return createRow(T.payroll, companyId, payroll);
}

export function updatePayroll(payroll: FinancePayroll) {
  return updateRow(T.payroll, { ...payroll, updatedAt: new Date().toISOString() });
}

export function payrollNet(p: FinancePayroll): number {
  return p.baseSalary + p.benefits - p.deductions;
}

export async function markPayrollPaid(companyId: string, payroll: FinancePayroll, accountId: string, paidDate: string, responsibleName: string, departmentId: string | null, existingTxns: FinanceTxn[]) {
  const net = payrollNet(payroll);
  const linkedTxnId = await linkTxn(companyId, "payroll", payroll.id, {
    type: "despesa", status: "pago", dueDate: payroll.dueDate, paidDate,
    competenceMonth: payroll.competenceMonth, amount: net, accountId, dreGroup: "despesasOperacionais",
    category: "Folha", counterparty: responsibleName, departmentId,
    description: `Folha ${payroll.competenceMonth} — ${responsibleName}`,
  }, payroll.linkedTxnId, existingTxns);
  return updatePayroll({ ...payroll, status: "pago", paidDate, accountId, linkedTxnId });
}

// ---- NFs de contratados ----
export const listContractorInvoices = (companyId: string) => listRows<FinanceContractorInvoice>(T.contractorInvoices, companyId);

export function createContractorInvoice(companyId: string, input: Partial<FinanceContractorInvoice>) {
  const now = new Date().toISOString();
  const inv: FinanceContractorInvoice = {
    id: newId("fnf"), userId: null, contractorName: "", competenceMonth: todayISO().slice(0, 7), nfNumber: "",
    amount: 0, dueDate: todayISO(), status: "pendente", receivedDate: null, paidDate: null, accountId: null,
    notes: "", linkedTxnId: null, createdAt: now, updatedAt: now, ...input,
  };
  return createRow(T.contractorInvoices, companyId, inv);
}

export function updateContractorInvoice(inv: FinanceContractorInvoice) {
  return updateRow(T.contractorInvoices, { ...inv, updatedAt: new Date().toISOString() });
}

export function contractorLabel(inv: FinanceContractorInvoice, resolvedUserName: string | null): string {
  return inv.userId ? (resolvedUserName ?? "—") : (inv.contractorName || "—");
}

export async function markContractorInvoicePaid(companyId: string, inv: FinanceContractorInvoice, accountId: string, paidDate: string, label: string, existingTxns: FinanceTxn[]) {
  const linkedTxnId = await linkTxn(companyId, "contractorInvoice", inv.id, {
    type: "despesa", status: "pago", dueDate: inv.dueDate, paidDate,
    competenceMonth: inv.competenceMonth, amount: inv.amount, accountId, dreGroup: "despesasOperacionais",
    category: "Terceiros/NFs", counterparty: label, description: `NF ${inv.nfNumber || inv.id} — ${label}`,
  }, inv.linkedTxnId, existingTxns);
  return updateContractorInvoice({ ...inv, status: "paga", receivedDate: inv.receivedDate || paidDate, paidDate, accountId, linkedTxnId });
}

// ---- Metas ----
export const listGoals = (companyId: string) => listRows<FinanceGoal>(T.goals, companyId);

export function createGoal(companyId: string, input: Partial<FinanceGoal>) {
  const now = new Date().toISOString();
  const goal: FinanceGoal = {
    id: newId("fgoal"), period: todayISO().slice(0, 7), periodType: "month", metricType: "receita",
    targetAmount: 0, departmentId: null, notes: "", createdAt: now, updatedAt: now, ...input,
  };
  return createRow(T.goals, companyId, goal);
}

export function updateGoal(goal: FinanceGoal) {
  return updateRow(T.goals, { ...goal, updatedAt: new Date().toISOString() });
}

export function actualFor(txns: FinanceTxn[], period: string, metricType: "receita" | "despesa" | "lucro", departmentId?: string | null): number {
  const relevant = txns.filter((t) => t.status === "pago" && t.competenceMonth === period && (!departmentId || t.departmentId === departmentId));
  const receita = relevant.filter((t) => t.type === "receita").reduce((s, t) => s + t.amount, 0);
  const despesa = relevant.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0);
  if (metricType === "receita") return receita;
  if (metricType === "despesa") return despesa;
  return receita - despesa;
}

// ---- DRE ----
export interface DreResult {
  groups: Record<string, { total: number; byCategory: Record<string, number> }>;
  resultado: number;
}

export function calculateDre(txns: FinanceTxn[], periodFrom: string, periodTo: string): DreResult {
  const relevant = txns.filter((t) => t.status === "pago" && t.competenceMonth >= periodFrom && t.competenceMonth <= periodTo);
  const groups: DreResult["groups"] = {
    receitaBruta: { total: 0, byCategory: {} },
    deducoes: { total: 0, byCategory: {} },
    custos: { total: 0, byCategory: {} },
    despesasOperacionais: { total: 0, byCategory: {} },
  };
  relevant.forEach((t) => {
    const group = groups[t.dreGroup] ?? groups.despesasOperacionais;
    const sign = t.type === "receita" ? 1 : -1;
    group.total += sign * t.amount;
    const cat = t.category || "Sem categoria";
    group.byCategory[cat] = (group.byCategory[cat] ?? 0) + sign * t.amount;
  });
  const resultado = Object.values(groups).reduce((s, g) => s + g.total, 0);
  return { groups, resultado };
}
