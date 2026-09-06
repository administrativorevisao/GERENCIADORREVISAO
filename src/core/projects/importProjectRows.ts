import type { SheetRow } from "../../shared/lib/googleSheets";
import { parseDateCell, findUserByNameOrEmail } from "../../shared/lib/importCells";
import { todayISO } from "../../shared/lib/dates";
import type { TeamUser } from "../team/types";
import { createProject, updateProject } from "./api";
import { COURSE_TYPE_LABEL, type CourseType } from "./guiaTemplates";
import { PROJECT_STATUS_LABEL, type Program, type Project, type ProjectStatus } from "./types";

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
}

function courseTypeFromLabel(v: unknown): CourseType | null {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return null;
  const hit = (Object.entries(COURSE_TYPE_LABEL) as [CourseType, string][]).find(([, label]) => label.toLowerCase() === s || label.toLowerCase().startsWith(s));
  return hit?.[0] ?? null;
}

function statusFromLabel(v: unknown): ProjectStatus | null {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return null;
  const hit = (Object.entries(PROJECT_STATUS_LABEL) as [ProjectStatus, string][]).find(([, label]) => label.toLowerCase() === s);
  return hit?.[0] ?? null;
}

function priorityFromLabel(v: unknown): Project["priority"] | null {
  const s = String(v || "").trim().toLowerCase();
  if (s.startsWith("alta")) return "high";
  if (s.startsWith("m")) return "medium";
  if (s.startsWith("baixa")) return "low";
  return null;
}

// Cada linha da planilha vira um projeto — casado por nome (dentro da
// empresa) com um projeto já existente (atualiza os campos) ou criado do
// zero. Não mexe em Briefing/Curso/Guias/Tarefas de projetos existentes.
export async function applyProjectRows(
  companyId: string,
  rows: SheetRow[],
  existingProjects: Project[],
  programs: Program[],
  users: TeamUser[],
): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0 };
  const byName = new Map(existingProjects.map((p) => [p.name.trim().toLowerCase(), p]));

  for (const r of rows) {
    const name = String(r["Nome"] || "").trim();
    if (!name) { result.skipped++; continue; }

    const programName = String(r["Programa"] || "").trim().toLowerCase();
    const program = programName ? programs.find((p) => p.name.trim().toLowerCase() === programName) : undefined;
    const owner = r["Responsável"] ? findUserByNameOrEmail(users, String(r["Responsável"])) : null;

    const patch: Partial<Project> = {
      name,
      description: String(r["Descrição"] || r["Descricao"] || "").trim(),
      programId: program?.id ?? null,
      ownerId: owner?.id ?? null,
      startDate: parseDateCell(r["Início"] || r["Inicio"]) ?? todayISO(),
      dueDate: parseDateCell(r["Prazo"]) ?? todayISO(),
      priority: priorityFromLabel(r["Prioridade"]) ?? "medium",
      status: statusFromLabel(r["Status"]) ?? "active",
      courseType: courseTypeFromLabel(r["Tipo de curso"]),
    };

    const existing = byName.get(name.toLowerCase());
    if (existing) {
      await updateProject({ ...existing, ...patch });
      result.updated++;
    } else {
      await createProject(companyId, patch);
      result.created++;
    }
  }
  return result;
}
