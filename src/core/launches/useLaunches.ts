import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../companies/CompanyContext";
import { createLaunch, listLaunches, removeLaunch, updateLaunch } from "./api";
import type { Launch, LaunchStatus } from "./types";

function launchesKey(companyId: string) {
  return ["launches", companyId] as const;
}

export function useLaunches() {
  const { company } = useCompany();
  return useQuery({ queryKey: launchesKey(company.id), queryFn: () => listLaunches(company.id) });
}

export function useCreateLaunch() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Launch>) => createLaunch(company.id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: launchesKey(company.id) }),
  });
}

export function useUpdateLaunch() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (launch: Launch) => updateLaunch(launch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: launchesKey(company.id) }),
  });
}

export function useUpdateLaunchStatus() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ launch, status }: { launch: Launch; status: LaunchStatus }) => updateLaunch({ ...launch, status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: launchesKey(company.id) }),
  });
}

export function useRemoveLaunch() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeLaunch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: launchesKey(company.id) }),
  });
}
