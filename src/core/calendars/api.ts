import { createRow, listRows, newId, updateRow, removeRow } from "../../shared/lib/jsonStore";
import { todayISO } from "../../shared/lib/dates";
import { DEFAULT_CALENDARS, type Calendar, type CalendarEvent } from "./types";

const CALENDARS_TABLE = "calendars";
const EVENTS_TABLE = "calendar_events";

export const listCalendars = (companyId: string) => listRows<Calendar>(CALENDARS_TABLE, companyId);

// Cria os calendários padrão que ainda não existem para a empresa — só
// deve ser chamado quando o usuário é admin (a escrita em "calendars" é
// restrita a admin pela RLS; um colaborador comum tentando semear os
// calendários receberia erro de permissão em vão).
export async function ensureDefaultCalendars(companyId: string, existing: Calendar[]): Promise<Calendar[]> {
  const missing = DEFAULT_CALENDARS.filter((d) => !existing.some((c) => c.id === d.id));
  if (missing.length === 0) return [];
  const now = new Date().toISOString();
  return Promise.all(missing.map((d) => createRow(CALENDARS_TABLE, companyId, { ...d, createdAt: now } as Calendar)));
}

export function createCalendar(companyId: string, input: { name: string; color: string }) {
  const calendar: Calendar = {
    id: newId("cal"),
    name: input.name,
    color: input.color,
    builtIn: false,
    createdAt: new Date().toISOString(),
  };
  return createRow(CALENDARS_TABLE, companyId, calendar);
}

export function updateCalendar(calendar: Calendar) {
  return updateRow(CALENDARS_TABLE, calendar);
}

export function removeCalendar(id: string) {
  return removeRow(CALENDARS_TABLE, id);
}

export const listCalendarEvents = (companyId: string) => listRows<CalendarEvent>(EVENTS_TABLE, companyId);

export function createCalendarEvent(companyId: string, input: Partial<CalendarEvent>, createdBy: string | null) {
  const event: CalendarEvent = {
    id: newId("cev"),
    calendarId: "",
    title: "",
    date: todayISO(),
    description: "",
    createdBy,
    createdAt: new Date().toISOString(),
    ...input,
  };
  return createRow(EVENTS_TABLE, companyId, event);
}

export function removeCalendarEvent(id: string) {
  return removeRow(EVENTS_TABLE, id);
}
