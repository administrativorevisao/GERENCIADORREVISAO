import type { SheetRow } from "../../shared/lib/googleSheets";
import { departmentIdFromName, parseDateCell } from "../../shared/lib/importCells";
import { createUser, updateUser } from "./api";
import type { TeamUser } from "./types";

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
}

// Cada linha da planilha vira um colaborador — casado por e-mail com quem
// já existe (atualiza) ou criado do zero. Linhas sem nome nem e-mail são
// ignoradas. Nunca cria/edita login (Supabase Auth) — só o perfil/diretório
// de equipe (tabela "users"), igual ao que a Central de Processos e o
// calendário de aniversários já leem.
export async function applyTeamRows(companyId: string, rows: SheetRow[], existingUsers: TeamUser[]): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0 };
  const byEmail = new Map(existingUsers.filter((u) => u.email).map((u) => [u.email.trim().toLowerCase(), u]));

  for (const r of rows) {
    const name = String(r["Nome"] || "").trim();
    const email = String(r["E-mail"] || r["Email"] || "").trim();
    if (!name && !email) { result.skipped++; continue; }

    const roleRaw = String(r["Papel"] || r["Perfil"] || "").trim().toLowerCase();
    const patch: Partial<TeamUser> = {
      name: name || undefined,
      shortName: String(r["Nome curto"] || r["Apelido"] || "").trim() || name.split(" ")[0] || undefined,
      email: email || undefined,
      jobTitle: String(r["Cargo"] || "").trim() || null,
      departmentId: departmentIdFromName(r["Setor"]),
      role: roleRaw.startsWith("admin") ? "admin" : "collaborator",
      birthDate: parseDateCell(r["Data de nascimento"] || r["Aniversário"] || r["Nascimento"]),
    };

    const existing = email ? byEmail.get(email.toLowerCase()) : undefined;
    if (existing) {
      await updateUser({ ...existing, ...patch, name: patch.name ?? existing.name, shortName: patch.shortName ?? existing.shortName, email: patch.email ?? existing.email });
      result.updated++;
    } else {
      await createUser(companyId, patch);
      result.created++;
    }
  }
  return result;
}
