import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../companies/CompanyContext";
import { useAuth } from "../../shared/auth/AuthContext";
import { createMeeting, listMeetings, updateMeeting } from "./api";
import type { Meeting } from "./types";

export function useMeetings() {
  const { company } = useCompany();
  return useQuery({ queryKey: ["meetings", company.id], queryFn: () => listMeetings(company.id) });
}

export function useCreateMeeting() {
  const { company } = useCompany();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Meeting>) => createMeeting(company.id, input, profile?.id ?? null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings", company.id] }),
  });
}

export function useUpdateMeeting() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (meeting: Meeting) => updateMeeting(meeting),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings", company.id] }),
  });
}
