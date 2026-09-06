import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../companies/CompanyContext";
import { useAuth } from "../../shared/auth/AuthContext";
import { isAdmin } from "../../shared/auth/types";
import * as api from "./api";
import type { Calendar, CalendarEvent } from "./types";

function calendarsKey(companyId: string) {
  return ["calendars", companyId] as const;
}
function eventsKey(companyId: string) {
  return ["calendar_events", companyId] as const;
}

export function useCalendars() {
  const { company } = useCompany();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: calendarsKey(company.id), queryFn: () => api.listCalendars(company.id) });

  useEffect(() => {
    if (!query.data || !isAdmin(profile)) return;
    api.ensureDefaultCalendars(company.id, query.data).then((created) => {
      if (created.length > 0) queryClient.invalidateQueries({ queryKey: calendarsKey(company.id) });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, profile?.role, company.id]);

  return query;
}

export function useCreateCalendar() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; color: string }) => api.createCalendar(company.id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarsKey(company.id) }),
  });
}

export function useUpdateCalendar() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (calendar: Calendar) => api.updateCalendar(calendar),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarsKey(company.id) }),
  });
}

export function useRemoveCalendar() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.removeCalendar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarsKey(company.id) }),
  });
}

export function useCalendarEvents() {
  const { company } = useCompany();
  return useQuery({ queryKey: eventsKey(company.id), queryFn: () => api.listCalendarEvents(company.id) });
}

export function useCreateCalendarEvent() {
  const { company } = useCompany();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CalendarEvent>) => api.createCalendarEvent(company.id, input, profile?.id ?? null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventsKey(company.id) }),
  });
}

export function useRemoveCalendarEvent() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.removeCalendarEvent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventsKey(company.id) }),
  });
}
