import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../companies/CompanyContext";
import { useAuth } from "../../shared/auth/AuthContext";
import {
  createProcedure, listProcedureRuns, listProcedures, removeProcedure, startProcedureRun, updateProcedure,
} from "./api";
import type { Procedure } from "./types";

function proceduresKey(companyId: string) {
  return ["procedures", companyId] as const;
}
function runsKey(companyId: string) {
  return ["procedure_runs", companyId] as const;
}

export function useProcedures() {
  const { company } = useCompany();
  return useQuery({ queryKey: proceduresKey(company.id), queryFn: () => listProcedures(company.id) });
}

export function useProcedureRuns() {
  const { company } = useCompany();
  return useQuery({ queryKey: runsKey(company.id), queryFn: () => listProcedureRuns(company.id) });
}

export function useSaveProcedure() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { procedure: Partial<Procedure>; existing?: Procedure }) =>
      input.existing ? updateProcedure({ ...input.existing, ...input.procedure }) : createProcedure(company.id, input.procedure),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: proceduresKey(company.id) }),
  });
}

export function useRemoveProcedure() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeProcedure(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: proceduresKey(company.id) }),
  });
}

export function useStartProcedureRun() {
  const { company } = useCompany();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ procedure, label }: { procedure: Procedure; label: string }) =>
      startProcedureRun(company.id, procedure, label, profile?.id ?? null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: runsKey(company.id) });
      queryClient.invalidateQueries({ queryKey: ["tasks", company.id] });
    },
  });
}
