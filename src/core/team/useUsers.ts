import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listRows } from "../../shared/lib/jsonStore";
import { useCompany } from "../companies/CompanyContext";
import { createUser, updateUser } from "./api";
import type { TeamUser } from "./types";

export function useUsers() {
  const { company } = useCompany();
  return useQuery({
    queryKey: ["users", company.id],
    queryFn: () => listRows<TeamUser>("users", company.id),
  });
}

export function useCreateUser() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<TeamUser>) => createUser(company.id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users", company.id] }),
  });
}

export function useUpdateUser() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (user: TeamUser) => updateUser(user),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users", company.id] }),
  });
}

export function userName(users: TeamUser[] | undefined, id: string | null): string {
  if (!id) return "—";
  return users?.find((u) => u.id === id)?.shortName ?? "—";
}
