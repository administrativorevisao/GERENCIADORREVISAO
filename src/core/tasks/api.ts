import { createRow, listRows, newId, removeRow, updateRow } from "../../shared/lib/jsonStore";
import type { Task, TaskStatus } from "./types";

const TABLE = "tasks";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

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

export function updateTaskStatus(task: Task, status: TaskStatus) {
  const now = new Date().toISOString();
  const updated: Task = {
    ...task,
    status,
    updatedAt: now,
    completedAt: status === "done" ? now : null,
  };
  return updateRow(TABLE, updated);
}

export function updateTask(task: Task) {
  return updateRow(TABLE, { ...task, updatedAt: new Date().toISOString() });
}

export function removeTask(id: string) {
  return removeRow(TABLE, id);
}
