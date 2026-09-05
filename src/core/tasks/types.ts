export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "high" | "medium" | "low";
export type TaskType = "project" | "recurring" | "standalone" | "process" | "weekly_objective" | "operational_event";

export const STATUSES: TaskStatus[] = ["todo", "doing", "done"];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "A fazer",
  doing: "Fazendo",
  done: "Concluído",
};
export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  responsibleId: string | null;
  teamId: string | null;
  departmentId: string | null;
  projectId: string | null;
  scheduledDate: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}
