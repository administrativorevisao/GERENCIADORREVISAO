import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../shared/lib/supabaseClient";

// Config do app inteiro (não por empresa) — Client ID OAuth do Google e a
// Chave de API usada pelo seletor de arquivos do Drive. Uma linha só no
// banco, id fixo "global".
export interface AppSettings {
  googleClientId: string;
  googleApiKey: string;
}

async function fetchAppSettings(): Promise<AppSettings> {
  if (!supabase) return { googleClientId: "", googleApiKey: "" };
  const { data } = await supabase.from("app_settings").select("data").eq("id", "global").maybeSingle();
  const d = data?.data as AppSettings | undefined;
  return { googleClientId: d?.googleClientId ?? "", googleApiKey: d?.googleApiKey ?? "" };
}

async function saveAppSettings(patch: Partial<AppSettings>) {
  if (!supabase) return;
  const current = await fetchAppSettings();
  const merged = { ...current, ...patch };
  const { error } = await supabase.from("app_settings").upsert({ id: "global", data: merged });
  if (error) throw error;
  return merged;
}

export function useAppSettings() {
  return useQuery({ queryKey: ["app_settings"], queryFn: fetchAppSettings });
}

export function useUpdateAppSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<AppSettings>) => saveAppSettings(patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["app_settings"] }),
  });
}
