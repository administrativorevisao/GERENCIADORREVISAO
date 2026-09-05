import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../../core/companies/CompanyContext";
import * as api from "./api";
import type {
  FinanceAccount, FinanceContractorInvoice, FinanceGoal, FinanceInvoice, FinancePayroll, FinanceTxn,
} from "./types";

function useCompanyId() {
  return useCompany().company.id;
}

function makeCrudHooks<T extends { id: string }>(key: string, list: (companyId: string) => Promise<T[]>) {
  function useList() {
    const companyId = useCompanyId();
    return useQuery({ queryKey: [key, companyId], queryFn: () => list(companyId) });
  }
  function useInvalidate() {
    const companyId = useCompanyId();
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: [key, companyId] });
  }
  return { useList, useInvalidate };
}

export const { useList: useTxns, useInvalidate: useInvalidateTxns } = makeCrudHooks<FinanceTxn>("finance_transactions", api.listTxns);
export const { useList: useAccounts, useInvalidate: useInvalidateAccounts } = makeCrudHooks<FinanceAccount>("finance_accounts", api.listAccounts);
export const { useList: useInvoices, useInvalidate: useInvalidateInvoices } = makeCrudHooks<FinanceInvoice>("finance_invoices", api.listInvoices);
export const { useList: usePayroll, useInvalidate: useInvalidatePayroll } = makeCrudHooks<FinancePayroll>("finance_payroll", api.listPayroll);
export const { useList: useContractorInvoices, useInvalidate: useInvalidateContractorInvoices } = makeCrudHooks<FinanceContractorInvoice>("finance_contractor_invoices", api.listContractorInvoices);
export const { useList: useGoals, useInvalidate: useInvalidateGoals } = makeCrudHooks<FinanceGoal>("finance_goals", api.listGoals);

export function useCreateTxn() {
  const companyId = useCompanyId();
  const invalidate = useInvalidateTxns();
  return useMutation({ mutationFn: (input: Partial<FinanceTxn>) => api.createTxn(companyId, input), onSuccess: invalidate });
}
export function useUpdateTxn() {
  const invalidate = useInvalidateTxns();
  return useMutation({ mutationFn: (txn: FinanceTxn) => api.updateTxn(txn), onSuccess: invalidate });
}

export function useCreateAccount() {
  const companyId = useCompanyId();
  const invalidate = useInvalidateAccounts();
  return useMutation({ mutationFn: (input: Partial<FinanceAccount>) => api.createAccount(companyId, input), onSuccess: invalidate });
}
export function useUpdateAccount() {
  const invalidate = useInvalidateAccounts();
  return useMutation({ mutationFn: (account: FinanceAccount) => api.updateAccount(account), onSuccess: invalidate });
}

export function useCreateInvoice() {
  const companyId = useCompanyId();
  const invalidate = useInvalidateInvoices();
  return useMutation({ mutationFn: (input: Partial<FinanceInvoice>) => api.createInvoice(companyId, input), onSuccess: invalidate });
}
export function useMarkInvoicePaid() {
  const companyId = useCompanyId();
  const invalidateInv = useInvalidateInvoices();
  const invalidateTxns = useInvalidateTxns();
  return useMutation({
    mutationFn: ({ invoice, accountId, paidDate, txns }: { invoice: FinanceInvoice; accountId: string; paidDate: string; txns: FinanceTxn[] }) =>
      api.markInvoicePaid(companyId, invoice, accountId, paidDate, txns),
    onSuccess: () => { invalidateInv(); invalidateTxns(); },
  });
}

export function useCreatePayroll() {
  const companyId = useCompanyId();
  const invalidate = useInvalidatePayroll();
  return useMutation({ mutationFn: (input: Partial<FinancePayroll>) => api.createPayroll(companyId, input), onSuccess: invalidate });
}
export function useMarkPayrollPaid() {
  const companyId = useCompanyId();
  const invalidatePay = useInvalidatePayroll();
  const invalidateTxns = useInvalidateTxns();
  return useMutation({
    mutationFn: ({ payroll, accountId, paidDate, responsibleName, departmentId, txns }: {
      payroll: FinancePayroll; accountId: string; paidDate: string; responsibleName: string; departmentId: string | null; txns: FinanceTxn[];
    }) => api.markPayrollPaid(companyId, payroll, accountId, paidDate, responsibleName, departmentId, txns),
    onSuccess: () => { invalidatePay(); invalidateTxns(); },
  });
}

export function useCreateContractorInvoice() {
  const companyId = useCompanyId();
  const invalidate = useInvalidateContractorInvoices();
  return useMutation({ mutationFn: (input: Partial<FinanceContractorInvoice>) => api.createContractorInvoice(companyId, input), onSuccess: invalidate });
}
export function useMarkContractorInvoicePaid() {
  const companyId = useCompanyId();
  const invalidateInv = useInvalidateContractorInvoices();
  const invalidateTxns = useInvalidateTxns();
  return useMutation({
    mutationFn: ({ invoice, accountId, paidDate, label, txns }: { invoice: FinanceContractorInvoice; accountId: string; paidDate: string; label: string; txns: FinanceTxn[] }) =>
      api.markContractorInvoicePaid(companyId, invoice, accountId, paidDate, label, txns),
    onSuccess: () => { invalidateInv(); invalidateTxns(); },
  });
}

export function useCreateGoal() {
  const companyId = useCompanyId();
  const invalidate = useInvalidateGoals();
  return useMutation({ mutationFn: (input: Partial<FinanceGoal>) => api.createGoal(companyId, input), onSuccess: invalidate });
}
