import { createRow, listRows, newId, updateRow } from "../../shared/lib/jsonStore";
import {
  emptyCoordenacao, emptyCourse, emptyCronogramaEstrutura, emptyEstruturaCurso, emptyLegislacaoLocalEstrutura,
  emptyMateriaisEstrutura, emptyOferta, type Briefing, type Course, type Program, type Project,
} from "./types";
import { todayISO } from "../../shared/lib/dates";

const PROJECTS_TABLE = "projects";
const PROGRAMS_TABLE = "programs";

// Projetos criados antes dos recursos de subprogramas/documentos/estrutura
// do curso não têm esses campos salvos (ou têm no formato antigo) — normaliza
// pra não quebrar quem espera o formato novo. cronogramaCompleto, modalidades,
// estruturaCurso e oferta mudaram de texto livre pra estruturas — qualquer
// valor antigo em formato errado é descartado, já que não tem como
// converter automaticamente texto solto nesses campos novos.
function normalizeCourse(course: Course | undefined): Course {
  if (!course) return { ...emptyCourse };
  const modalidades = typeof course.modalidades === "string" && course.modalidades in MODALIDADE_KEYS ? course.modalidades : "";
  const estruturaRaw = course.estruturaCurso as unknown;
  const estruturaCurso = estruturaRaw && typeof estruturaRaw === "object" ? {
    coordenacao: { ...emptyCoordenacao, ...(estruturaRaw as { coordenacao?: object }).coordenacao },
    cronograma: { ...emptyCronogramaEstrutura, ...(estruturaRaw as { cronograma?: object }).cronograma },
    materiais: { ...emptyMateriaisEstrutura, ...(estruturaRaw as { materiais?: object }).materiais },
    legislacaoLocal: { ...emptyLegislacaoLocalEstrutura, ...(estruturaRaw as { legislacaoLocal?: object }).legislacaoLocal },
  } : { ...emptyEstruturaCurso };
  const ofertaRaw = course.oferta as unknown;
  const oferta = ofertaRaw && typeof ofertaRaw === "object" ? { ...emptyOferta, ...ofertaRaw } : { ...emptyOferta };
  return {
    ...emptyCourse,
    ...course,
    cronogramaCompleto: Array.isArray(course.cronogramaCompleto) ? course.cronogramaCompleto : [],
    modalidades,
    estruturaCurso,
    oferta,
  };
}
const MODALIDADE_KEYS: Record<string, true> = {
  objetiva: true, discursiva_com_sem_correcao: true, objetiva_discursiva_com_sem_correcao: true,
  objetiva_discursiva_sem_correcao: true, pacote_especial: true, prova_oral_online: true,
  prova_oral_online_presencial: true, semana_vespera: true,
};

export async function listProjects(companyId: string): Promise<Project[]> {
  const rows = await listRows<Project>(PROJECTS_TABLE, companyId);
  return rows.map((p) => ({
    ...p,
    subProgramId: p.subProgramId ?? null,
    documents: p.documents ?? [],
    course: normalizeCourse(p.course),
  }));
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
    documents: [],
    ...input,
  };
  return createRow(PROJECTS_TABLE, companyId, project);
}

export function updateProject(project: Project) {
  return updateRow(PROJECTS_TABLE, project);
}
