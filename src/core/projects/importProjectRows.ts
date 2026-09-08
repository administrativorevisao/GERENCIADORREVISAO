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

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Além do rótulo exato usado no app ("Em andamento", "Concluído"...),
// reconhece os valores como aparecem nas planilhas reais da empresa
// (ex: a coluna "Status CURSO" usa só "ATIVO"/"CONCLUÍDO").
function statusFromLabel(v: unknown): ProjectStatus | null {
  const s = stripAccents(String(v || "").trim().toLowerCase());
  if (!s) return null;
  const hit = (Object.entries(PROJECT_STATUS_LABEL) as [ProjectStatus, string][]).find(([, label]) => stripAccents(label.toLowerCase()) === s);
  if (hit) return hit[0];
  if (["ativo", "ativa", "em andamento"].includes(s)) return "active";
  if (["concluido", "concluida", "finalizado", "finalizada", "encerrado"].includes(s)) return "done";
  if (["pausado", "pausada", "em espera", "pendente"].includes(s)) return "hold";
  if (["cancelado", "cancelada"].includes(s)) return "cancelled";
  if (["planejamento", "planejado", "planejada"].includes(s)) return "planning";
  return null;
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
    // Aceita tanto os nomes de coluna do modelo (Nome/Descrição/Início/Prazo/
    // Responsável/Status) quanto os nomes reais já usados na planilha de
    // controle de cursos da empresa (Nome do Curso/Observações/Início de
    // Venda/Data da Prova/Coordenador/Status CURSO).
    const name = String(r["Nome"] || r["Nome do Curso"] || "").trim();
    if (!name) { result.skipped++; continue; }

    const programName = String(r["Programa"] || "").trim().toLowerCase();
    const program = programName ? programs.find((p) => p.name.trim().toLowerCase() === programName) : undefined;
    const ownerName = r["Responsável"] || r["Coordenador"];
    const owner = ownerName ? findUserByNameOrEmail(users, String(ownerName)) : null;

    const patch: Partial<Project> = {
      name,
      description: String(r["Descrição"] || r["Descricao"] || r["Observações"] || r["Observacoes"] || "").trim(),
      programId: program?.id ?? null,
      ownerId: owner?.id ?? null,
      startDate: parseDateCell(r["Início"] || r["Inicio"] || r["Início de Venda"] || r["Inicio de Venda"]) ?? todayISO(),
      dueDate: parseDateCell(r["Prazo"] || r["Data da Prova"] || r["Fim de Acesso"]) ?? todayISO(),
      priority: priorityFromLabel(r["Prioridade"]) ?? "medium",
      status: statusFromLabel(r["Status"] || r["Status CURSO"] || r["Status Curso"]) ?? "active",
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
