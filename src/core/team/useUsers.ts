import { useQuery } from "@tanstack/react-query";
import { listRows } from "../../shared/lib/jsonStore";
import { useCompany } from "../companies/CompanyContext";
import type { TeamUser } from "./types";

export function useUsers() {
  const { company } = useCompany();
  return useQuery({
    queryKey: ["users", company.id],
    queryFn: () => listRows<TeamUser>("users", company.id),
  });
}

export function userName(users: TeamUser[] | undefined, id: string | null): string {
  if (!id) return "—";
  return users?.find((u) => u.id === id)?.shortName ?? "—";
}
