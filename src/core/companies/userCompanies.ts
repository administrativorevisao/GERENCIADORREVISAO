import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../shared/lib/supabaseClient";
import { newId } from "../../shared/lib/jsonStore";

// public.user_companies é uma tabela relacional de verdade (não o padrão
// JSON-first do resto do app) — cada linha é só "este colaborador também
// acessa esta empresa", além da empresa principal em users.company_id.
function requireClient() {
  if (!supabase) throw new Error("Supabase não configurado — preencha .env.local.");
  return supabase;
}

export async function listUserCompanyIds(userId: string): Promise<string[]> {
  const { data, error } = await requireClient().from("user_companies").select("company_id").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.company_id as string);
}

export function useUserCompanyIds(userId: string | null) {
  return useQuery({
    queryKey: ["user_companies", userId],
    queryFn: () => (userId ? listUserCompanyIds(userId) : Promise.resolve([] as string[])),
    enabled: Boolean(userId),
  });
}

// Substitui a lista inteira de empresas extras do colaborador (mais simples
// que calcular diff — o formulário sempre manda o conjunto final desejado).
export function useSetUserCompanies() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, companyIds }: { userId: string; companyIds: string[] }) => {
      const client = requireClient();
      const { error: delErr } = await client.from("user_companies").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      if (companyIds.length > 0) {
        const rows = companyIds.map((companyId) => ({ id: newId("uc"), user_id: userId, company_id: companyId }));
        const { error: insErr } = await client.from("user_companies").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["user_companies", vars.userId] });
    },
  });
}
