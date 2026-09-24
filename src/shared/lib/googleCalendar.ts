import { getGoogleAccessToken } from "./googleSheets";

// Agenda Google fixa onde o Cronograma completo do curso é sincronizado
// automaticamente (uma data do curso = um evento de dia inteiro nesta
// agenda). Pedido explícito do usuário: sempre esta agenda, não configurável.
export const SCHEDULE_CALENDAR_ID = "c_eb1b14fd05a3f38102a28dbec22c73c7875bc09a2e277e22f100a74c6db8b103@group.calendar.google.com";

function eventBody(summary: string, dateISO: string, description?: string) {
  return { summary, description, start: { date: dateISO }, end: { date: dateISO } };
}

export async function createCalendarEvent(clientId: string, summary: string, dateISO: string, description?: string): Promise<string> {
  const token = await getGoogleAccessToken(clientId);
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(SCHEDULE_CALENDAR_ID)}/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(eventBody(summary, dateISO, description)),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Agenda (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.id as string;
}

export async function updateCalendarEvent(clientId: string, eventId: string, summary: string, dateISO: string, description?: string): Promise<void> {
  const token = await getGoogleAccessToken(clientId);
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(SCHEDULE_CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(eventBody(summary, dateISO, description)),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Agenda (${res.status}): ${body.slice(0, 200)}`);
  }
}

// 404/410 (evento já não existe do lado do Google) não é erro aqui — o
// objetivo (não sobrar mais na agenda) já foi alcançado.
export async function deleteCalendarEvent(clientId: string, eventId: string): Promise<void> {
  const token = await getGoogleAccessToken(clientId);
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(SCHEDULE_CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Agenda (${res.status}): ${body.slice(0, 200)}`);
  }
}
