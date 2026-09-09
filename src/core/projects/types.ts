import type { CourseType, GuiaContent, ScheduledMessage, SectorLink } from "./guiaTemplates";

export type ProjectStatus = "planning" | "active" | "hold" | "done" | "cancelled";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planejamento",
  active: "Em andamento",
  hold: "Em espera",
  done: "Concluído",
  cancelled: "Cancelado",
};

export interface KeyDate {
  id: string;
  label: string;
  date: string;
}

export interface Briefing {
  content: string;
  keyDates: KeyDate[];
  updatedAt: string | null;
  updatedBy: string | null;
}

// Detalhes do curso/edital do projeto — o "documento único" que centraliza
// as informações que todos os setores consultam (pedagógico, comercial,
// marketing, CS…). Espelha defaultCourse()/EDITAL_FIELDS do app original.
export interface Course {
  orgaoEstado: string;
  cargoCarreira: string;
  vagas: string;
  remuneracao: string;
  banca: string;
  linkConcurso: string;
  analiseEdital: string;
  disciplinas: string;
  cronogramaCompleto: string;
  observacoes: string;
  coordenador: string;
  modalidades: string;
  inicioVendas: string;
  tempoAcesso: string;
  tipoCronograma: string;
  estruturaCurso: string;
  duracaoSemanas: string;
  preco: string;
  parcelamento: string;
  condicoesComercialCs: string;
}

export const emptyCourse: Course = {
  orgaoEstado: "", cargoCarreira: "", vagas: "", remuneracao: "", banca: "", linkConcurso: "",
  analiseEdital: "", disciplinas: "", cronogramaCompleto: "", observacoes: "", coordenador: "", modalidades: "",
  inicioVendas: "", tempoAcesso: "", tipoCronograma: "", estruturaCurso: "", duracaoSemanas: "", preco: "",
  parcelamento: "", condicoesComercialCs: "",
};

export function courseHasData(course: Course): boolean {
  return Object.values(course).some((v) => v.trim());
}

export interface Project {
  id: string;
  name: string;
  description: string;
  iconImage: string | null;
  programId: string | null;
  subProgramId: string | null;
  ownerId: string | null;
  startDate: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  status: ProjectStatus;
  briefing: Briefing;
  course: Course;
  courseType: CourseType | null;
  guias: GuiaContent[];
  scheduledMessages: ScheduledMessage[];
  sectorLinks: SectorLink[];
}

export const PROGRAM_COLORS = [
  "#6d28d9", "#dc2626", "#d97706", "#2563eb", "#0891b2",
  "#059669", "#db2777", "#65a30d", "#4f46e5", "#0d9488",
];

export interface Program {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconImage: string | null;
  color: string;
  departmentId: string | null;
  ownerId: string | null;
  subPrograms: SubProgram[];
}

// Agrupamento dentro de um programa — ex: dentro do programa "Perpétuo",
// cada concurso (PGE/AC, PGM Rio de Janeiro...) é um subprograma que junta
// os vários projetos/sprints daquele mesmo concurso.
export interface SubProgram {
  id: string;
  name: string;
}
