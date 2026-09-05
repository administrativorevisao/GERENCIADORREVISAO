import { createRow, listRows, newId, updateRow } from "../../shared/lib/jsonStore";
import type { Briefing, Program, Project } from "./types";
import { todayISO } from "../../shared/lib/dates";

const PROJECTS_TABLE = "projects";
const PROGRAMS_TABLE = "programs";

export function listProjects(companyId: string) {
  return listRows<Project>(PROJECTS_TABLE, companyId);
}

export function listPrograms(companyId: string) {
  return listRows<Program>(PROGRAMS_TABLE, companyId);
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
    ...input,
  };
  return createRow(PROGRAMS_TABLE, companyId, program);
}

const emptyBriefing: Briefing = { content: "", keyDates: [], updatedAt: null, updatedBy: null };

export function createProject(companyId: string, input: Partial<Project>) {
  const project: Project = {
    id: newId("p"),
    name: "",
    description: "",
    iconImage: null,
    programId: null,
    departmentId: null,
    ownerId: null,
    startDate: todayISO(),
    dueDate: todayISO(),
    priority: "medium",
    status: "active",
    briefing: emptyBriefing,
    ...input,
  };
  return createRow(PROJECTS_TABLE, companyId, project);
}

export function updateProject(project: Project) {
  return updateRow(PROJECTS_TABLE, project);
}
