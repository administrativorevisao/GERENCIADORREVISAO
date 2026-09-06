import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRow, listRows, newId, updateRow } from "../../shared/lib/jsonStore";
import { useCompany } from "../../core/companies/CompanyContext";
import type { FinViewId } from "./types";

const TABLE = "finance_sheet_links";

export interface SheetLink {
  id: string;
  view: FinViewId;
  sheetId: string;
  sheetUrl: string;
  tabs: string[] | null;
  range: string;
  lastSyncAt: string | null;
  lastSyncCount: number;
  createdAt: string;
}

export function listSheetLinks(companyId: string) {
  return listRows<SheetLink>(TABLE, companyId);
}

export function useSheetLinks() {
  const { company } = useCompany();
  return useQuery({ queryKey: [TABLE, company.id], queryFn: () => listSheetLinks(company.id) });
}

export function useSaveSheetLink() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { view: FinViewId; sheetId: string; sheetUrl: string; tabs: string[] | null; range: string; existing?: SheetLink }) => {
      const link: SheetLink = {
        id: input.existing?.id ?? newId("shl"),
        view: input.view,
        sheetId: input.sheetId,
        sheetUrl: input.sheetUrl,
        tabs: input.tabs,
        range: input.range,
        lastSyncAt: input.existing?.lastSyncAt ?? null,
        lastSyncCount: input.existing?.lastSyncCount ?? 0,
        createdAt: input.existing?.createdAt ?? new Date().toISOString(),
      };
      return input.existing ? updateRow(TABLE, link) : createRow(TABLE, company.id, link);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [TABLE, company.id] }),
  });
}

export function useMarkSheetSynced() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { link: SheetLink; count: number }) =>
      updateRow(TABLE, { ...input.link, lastSyncAt: new Date().toISOString(), lastSyncCount: input.count }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [TABLE, company.id] }),
  });
}
