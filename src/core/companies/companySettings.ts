import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../shared/lib/supabaseClient";
import { useCompany } from "./CompanyContext";

export interface CompanySettings {
  customLogo: string | null;
}

async function fetchCompanySettings(companyId: string): Promise<CompanySettings> {
  if (!supabase) return { customLogo: null };
  const { data } = await supabase.from("company_settings").select("data").eq("id", companyId).maybeSingle();
  return { customLogo: (data?.data as CompanySettings | undefined)?.customLogo ?? null };
}

async function saveCompanySettings(companyId: string, patch: Partial<CompanySettings>) {
  if (!supabase) return;
  const current = await fetchCompanySettings(companyId);
  const merged = { ...current, ...patch };
  const { error } = await supabase.from("company_settings").upsert({ id: companyId, company_id: companyId, data: merged });
  if (error) throw error;
  return merged;
}

export function useCompanySettings() {
  const { company } = useCompany();
  return useQuery({ queryKey: ["company_settings", company.id], queryFn: () => fetchCompanySettings(company.id) });
}

export function useUpdateCompanySettings() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<CompanySettings>) => saveCompanySettings(company.id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company_settings", company.id] }),
  });
}
