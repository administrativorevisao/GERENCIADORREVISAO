import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../companies/CompanyContext";
import { createProgram, createProject, listPrograms, listProjects, updateProgram, updateProject } from "./api";
import type { Program, Project } from "./types";

export function useProjects() {
  const { company } = useCompany();
  return useQuery({ queryKey: ["projects", company.id], queryFn: () => listProjects(company.id) });
}

export function usePrograms() {
  const { company } = useCompany();
  return useQuery({ queryKey: ["programs", company.id], queryFn: () => listPrograms(company.id) });
}

export function useCreateProgram() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Program>) => createProgram(company.id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["programs", company.id] }),
  });
}

export function useCreateProject() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Project>) => createProject(company.id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", company.id] }),
  });
}

export function useUpdateProject() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (project: Project) => updateProject(project),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", company.id] }),
  });
}

export function useUpdateProgram() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (program: Program) => updateProgram(program),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["programs", company.id] }),
  });
}
