import { createRow, getRow, listRows, newId, updateRow } from "../../shared/lib/jsonStore";
import { supabase } from "../../shared/lib/supabaseClient";
import type { TeamUser } from "./types";

const USERS_TABLE = "users";

export function createUser(companyId: string, input: Partial<TeamUser>) {
  const user: TeamUser = {
    id: newId("u"),
    name: "",
    shortName: "",
    email: "",
    role: "collaborator",
    jobTitle: null,
    departmentId: null,
    teamId: null,
    birthDate: null,
    roleId: null,
    allowedViews: null,
    financeAccess: false,
    avatarImage: null,
    notes: "",
    paymentType: null,
    paymentAmount: null,
    paymentBankInfo: "",
    hasLogin: false,
    ...input,
  };
  return createRow(USERS_TABLE, companyId, user);
}

async function companyIdOfUser(id: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.from(USERS_TABLE).select("company_id").eq("id", id).maybeSingle();
  return (data?.company_id as string | undefined) ?? null;
}

// Trava de segurança: nunca deixa a empresa ficar sem nenhum Admin — foi
// exatamente isso que aconteceu uma vez nesta base (o único Admin virou
// Colaborador sem ninguém perceber, e o botão de gerenciar Equipe
// desapareceu para todo mundo). Se esta atualização tira o "admin" de
// quem era o ÚLTIMO admin da empresa, bloqueia.
export async function updateUser(user: TeamUser): Promise<TeamUser> {
  if (user.role !== "admin") {
    const existing = await getRow<TeamUser>(USERS_TABLE, user.id);
    if (existing?.role === "admin") {
      const companyId = await companyIdOfUser(user.id);
      if (companyId) {
        const all = await listRows<TeamUser>(USERS_TABLE, companyId);
        const otherAdmins = all.filter((u) => u.id !== user.id && u.role === "admin");
        if (otherAdmins.length === 0) {
          throw new Error('Não é possível remover o "Admin" de ' + (user.name || "este colaborador") + " — é o único administrador da empresa. Torne outra pessoa Admin antes de mudar isso.");
        }
      }
    }
  }
  return updateRow(USERS_TABLE, user);
}
