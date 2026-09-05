export type ProjectStatus = "planning" | "active" | "hold" | "done" | "cancelled";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planejamento",
  active: "Em andamento",
  hold: "Em espera",
  done: "Concluído",
  cancelled: "Cancelado",
};

export interface Briefing {
  content: string;
  keyDates: { label: string; date: string }[];
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  iconImage: string | null;
  programId: string | null;
  departmentId: string | null;
  ownerId: string | null;
  startDate: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  status: ProjectStatus;
  briefing: Briefing;
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
}
