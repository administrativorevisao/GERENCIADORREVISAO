import { createRow, listRows, newId, updateRow } from "../../shared/lib/jsonStore";
import { emptyCourse, type Briefing, type Program, type Project } from "./types";
import { todayISO } from "../../shared/lib/dates";

const PROJECTS_TABLE = "projects";
const PROGRAMS_TABLE = "programs";

// Projetos criados antes do recurso de subprogramas não têm esse campo
// salvo — normaliza para null (equivalente a "sem concurso").
export async function listProjects(companyId: string): Promise<Project[]> {
  const rows = await listRows<Project>(PROJECTS_TABLE, companyId);
  return rows.map((p) => ({ ...p, subProgramId: p.subProgramId ?? null }));
}

// Programas criados antes do recurso de subprogramas não têm esse campo
// salvo — normaliza para [] pra não quebrar quem espera um array.
export async function listPrograms(companyId: string): Promise<Program[]> {
  const rows = await listRows<Program>(PROGRAMS_TABLE, companyId);
  return rows.map((p) => ({ ...p, subPrograms: p.subPrograms ?? [] }));
}

export function createProgram(companyId: string, input: Partial<Program>) {
  const program: Program = {
    id: newId("prog"),
    name: "",
    description: "",
    icon: "📁",
    iconImage: null,
    color: "#6d28d9",
    departmentId: null,
    ownerId: null,
    subPrograms: [],
    ...input,
  };
  return createRow(PROGRAMS_TABLE, companyId, program);
}

export function updateProgram(program: Program) {
  return updateRow(PROGRAMS_TABLE, program);
}

const emptyBriefing: Briefing = { content: "", keyDates: [], updatedAt: null, updatedBy: null };

export function createProject(companyId: string, input: Partial<Project>) {
  const project: Project = {
    id: newId("p"),
    name: "",
    description: "",
    iconImage: null,
    programId: null,
    subProgramId: null,
    ownerId: null,
    startDate: todayISO(),
    dueDate: todayISO(),
    priority: "medium",
    status: "active",
    briefing: emptyBriefing,
    course: emptyCourse,
    courseType: null,
    guias: [],
    scheduledMessages: [],
    sectorLinks: [],
    ...input,
  };
  return createRow(PROJECTS_TABLE, companyId, project);
}

export function updateProject(project: Project) {
  return updateRow(PROJECTS_TABLE, project);
}
