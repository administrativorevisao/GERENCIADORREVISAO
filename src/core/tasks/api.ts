import { createRow, listRows, newId, removeRow, updateRow } from "../../shared/lib/jsonStore";
import { todayISO as today } from "../../shared/lib/dates";
import type { Task, TaskStatus } from "./types";

const TABLE = "tasks";

export function listTasks(companyId: string) {
  return listRows<Task>(TABLE, companyId);
}

export function createTask(companyId: string, input: Partial<Task>, createdBy: string) {
  const now = new Date().toISOString();
  const task: Task = {
    id: newId("t"),
    title: "",
    description: "",
    type: "standalone",
    status: "todo",
    priority: "medium",
    responsibleId: createdBy,
    teamId: null,
    departmentId: null,
    projectId: null,
    scheduledDate: today(),
    dueDate: today(),
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    ...input,
  };
  return createRow(TABLE, companyId, task);
}

export async function updateTaskStatus(task: Task, status: TaskStatus) {
  const now = new Date().toISOString();
  const updated: Task = {
    ...task,
    status,
    updatedAt: now,
    completedAt: status === "done" ? now : null,
  };
  const saved = await updateRow(TABLE, updated);
  // Import dinâmico (não no topo do arquivo) para não criar uma dependência
  // circular: teamStandards/api.ts importa createTask daqui mesmo.
  if (status === "done" && task.procedureRunId) {
    const { advanceProcedureRun } = await import("../teamStandards/api");
    await advanceProcedureRun(task.procedureRunId).catch((e) => console.error("Falha ao avançar procedimento:", e));
  }
  return saved;
}

export function updateTask(task: Task) {
  return updateRow(TABLE, { ...task, updatedAt: new Date().toISOString() });
}

export function removeTask(id: string) {
  return removeRow(TABLE, id);
}
