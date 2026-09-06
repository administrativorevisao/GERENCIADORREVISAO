import { supabase } from "../../shared/lib/supabaseClient";

// Chama a Edge Function "admin-create-login" (ver supabase/functions/) que
// cria — ou redefine a senha de — o login de acesso (Supabase Auth) de um
// colaborador. Só funciona chamado por um administrador logado; a função
// confere isso do lado do servidor antes de fazer qualquer coisa.
export async function createOrResetLogin(email: string, password: string): Promise<{ action: "created" | "updated" }> {
  if (!supabase) throw new Error("Supabase não configurado.");
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; action: "created" | "updated"; error?: string }>(
    "admin-create-login",
    { body: { email, password } },
  );
  if (error) throw new Error(error.message || "Falha ao criar login.");
  if (!data?.ok) throw new Error(data?.error || "Falha ao criar login.");
  return { action: data.action };
}
