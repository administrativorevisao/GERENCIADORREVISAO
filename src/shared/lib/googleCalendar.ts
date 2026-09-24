import { getGoogleAccessToken } from "./googleSheets";

// Agenda Google fixa onde o Cronograma completo do curso (aba Concurso) é
// sincronizado automaticamente. Pedido explícito do usuário: sempre esta
// agenda, não configurável.
export const SCHEDULE_CALENDAR_ID = "c_eb1b14fd05a3f38102a28dbec22c73c7875bc09a2e277e22f100a74c6db8b103@group.calendar.google.com";

// Segunda agenda fixa, usada pelas datas da Estrutura do curso (Coordenação
// — encontro de início; Cronograma — data de início; Legislação Local —
// data de início da parte local). Agenda diferente da anterior, também
// pedida explicitamente pelo usuário.
export const STRUCTURE_CALENDAR_ID = "c_b401d1295272332c2250dd7d7a3b3bae92f2a8408d534da31f38b4a13260c554@group.calendar.google.com";

function eventBody(summary: string, dateISO: string, description?: string) {
  return { summary, description, start: { date: dateISO }, end: { date: dateISO } };
}

export async function createCalendarEvent(clientId: string, calendarId: string, summary: string, dateISO: string, description?: string): Promise<string> {
  const token = await getGoogleAccessToken(clientId);
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
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

export async function updateCalendarEvent(clientId: string, calendarId: string, eventId: string, summary: string, dateISO: string, description?: string): Promise<void> {
  const token = await getGoogleAccessToken(clientId);
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
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
export async function deleteCalendarEvent(clientId: string, calendarId: string, eventId: string): Promise<void> {
  const token = await getGoogleAccessToken(clientId);
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Agenda (${res.status}): ${body.slice(0, 200)}`);
  }
}
