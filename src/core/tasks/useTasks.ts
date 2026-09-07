import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../companies/CompanyContext";
import { useAuth } from "../../shared/auth/AuthContext";
import { createTask, listTasks, removeTask, updateTask, updateTaskStatus } from "./api";
import type { Task, TaskStatus } from "./types";

function tasksKey(companyId: string) {
  return ["tasks", companyId] as const;
}

export function useTasks() {
  const { company } = useCompany();
  return useQuery({
    queryKey: tasksKey(company.id),
    queryFn: () => listTasks(company.id),
  });
}

export function useCreateTask() {
  const { company } = useCompany();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Task>) => createTask(company.id, input, profile?.id ?? ""),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksKey(company.id) }),
  });
}

export function useUpdateTaskStatus() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ task, status }: { task: Task; status: TaskStatus }) => updateTaskStatus(task, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKey(company.id) });
      // Concluir uma tarefa pode disparar o avanço automático de um
      // Procedimento Padrão (ver core/teamStandards/api.ts) — atualiza a
      // lista de execuções também, por garantia (invalidação é barata).
      queryClient.invalidateQueries({ queryKey: ["procedure_runs", company.id] });
    },
  });
}

export function useUpdateTask() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (task: Task) => updateTask(task),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksKey(company.id) }),
  });
}

export function useRemoveTask() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeTask(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksKey(company.id) }),
  });
}
