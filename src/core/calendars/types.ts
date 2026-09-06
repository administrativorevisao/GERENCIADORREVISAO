export interface Calendar {
  id: string;
  name: string;
  color: string;
  builtIn: boolean;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  description: string;
  createdBy: string | null;
  createdAt: string;
}

export const BIRTHDAYS_CALENDAR_ID = "cal_aniversarios";

// Calendários que toda empresa já nasce com — o de aniversários é
// "virtual": nunca guarda calendar_events próprios, seus eventos são
// calculados a partir de users.birthDate (ver useBirthdayEvents).
export const DEFAULT_CALENDARS: Omit<Calendar, "createdAt">[] = [
  { id: "cal_concursos", name: "Concursos", color: "#dc2626", builtIn: true },
  { id: "cal_conteudo", name: "Conteúdo", color: "#2563eb", builtIn: true },
  { id: "cal_simulados", name: "Simulados", color: "#d97706", builtIn: true },
  { id: BIRTHDAYS_CALENDAR_ID, name: "Aniversários", color: "#db2777", builtIn: true },
  { id: "cal_geral", name: "Geral da empresa", color: "#059669", builtIn: true },
];

export const CALENDAR_COLORS = [
  "#dc2626", "#d97706", "#059669", "#2563eb", "#7c3aed",
  "#db2777", "#0891b2", "#65a30d", "#4f46e5", "#78716c",
];
