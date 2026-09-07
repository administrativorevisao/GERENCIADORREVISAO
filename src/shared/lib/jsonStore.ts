import { supabase } from "./supabaseClient";

// Todas as tabelas do Supabase seguem o padrão JSON-first já usado no
// RevisãoOS antigo: (id text pk, company_id text, data jsonb). Este helper
// genérico faz list/create/update/remove nesse formato, sempre filtrando
// por empresa — a base de toda a isolação multiempresa no cliente (a RLS
// no banco é a segunda camada, ver supabase/schema.sql).
export interface JsonRow {
  id: string;
}

function requireClient() {
  if (!supabase) throw new Error("Supabase não configurado — preencha .env.local.");
  return supabase;
}

export async function listRows<T extends JsonRow>(table: string, companyId: string): Promise<T[]> {
  const { data, error } = await requireClient()
    .from(table)
    .select("id,data")
    .eq("company_id", companyId);
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, ...(row.data as object) }) as T);
}

// Busca uma linha só pelo id (sem precisar saber a empresa — a RLS já
// garante que só volta algo se for da empresa do usuário logado). Usado
// quando um fluxo só tem o id à mão (ex: avançar uma etapa de procedimento
// a partir do id salvo na tarefa).
export async function getRow<T extends JsonRow>(table: string, id: string): Promise<T | null> {
  const { data, error } = await requireClient().from(table).select("id,data").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, ...(data.data as object) } as T;
}

export async function createRow<T extends JsonRow>(table: string, companyId: string, row: T): Promise<T> {
  const { error } = await requireClient()
    .from(table)
    .insert({ id: row.id, company_id: companyId, data: row });
  if (error) throw error;
  return row;
}

export async function updateRow<T extends JsonRow>(table: string, row: T): Promise<T> {
  const { error } = await requireClient().from(table).update({ data: row }).eq("id", row.id);
  if (error) throw error;
  return row;
}

export async function removeRow(table: string, id: string): Promise<void> {
  const { error } = await requireClient().from(table).delete().eq("id", id);
  if (error) throw error;
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}
