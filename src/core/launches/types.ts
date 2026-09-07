export type LaunchStatus = "backlog" | "planejado" | "em_andamento" | "lancado";

export const LAUNCH_STATUSES: LaunchStatus[] = ["backlog", "planejado", "em_andamento", "lancado"];

export const LAUNCH_STATUS_LABEL: Record<LaunchStatus, string> = {
  backlog: "Backlog",
  planejado: "Planejado",
  em_andamento: "Em andamento",
  lancado: "Lançado",
};

export interface Launch {
  id: string;
  name: string;
  description: string;
  status: LaunchStatus;
  launchDate: string | null;
  ownerId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
