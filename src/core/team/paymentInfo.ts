import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../companies/CompanyContext";
import { createRow, listRows, newId, updateRow } from "../../shared/lib/jsonStore";
import type { TeamPaymentInfo } from "./types";

const TABLE = "team_payment_info";

export function usePaymentInfo() {
  const { company } = useCompany();
  return useQuery({
    queryKey: [TABLE, company.id],
    queryFn: () => listRows<TeamPaymentInfo>(TABLE, company.id),
  });
}

export function paymentInfoFor(list: TeamPaymentInfo[] | undefined, userId: string): TeamPaymentInfo | null {
  return list?.find((p) => p.userId === userId) ?? null;
}

// Sempre atualiza a linha existente do colaborador (se houver) ou cria uma
// nova — chamador passa a lista já carregada via usePaymentInfo() pra achar
// a existente, evitando outra query.
export function useSavePaymentInfo() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, input, existing }: { userId: string; input: Partial<TeamPaymentInfo>; existing: TeamPaymentInfo[] }) => {
      const found = existing.find((p) => p.userId === userId);
      if (found) return updateRow(TABLE, { ...found, ...input, userId });
      const row: TeamPaymentInfo = { id: newId("tpay"), userId, paymentType: null, paymentAmount: null, paymentBankInfo: "", ...input };
      return createRow(TABLE, company.id, row);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [TABLE, company.id] }),
  });
}
