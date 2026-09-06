import type { TeamUser } from "../team/types";
import { BIRTHDAYS_CALENDAR_ID, type CalendarEvent } from "./types";

// Gera eventos sintéticos (não persistidos) de aniversário para um ano
// específico, a partir de users.birthDate ("YYYY-MM-DD" — só mês/dia
// importam). Recalculado a cada troca de mês/ano na visualização, nunca
// gravado em calendar_events — por isso não tem id salvo no banco.
export function birthdayEventsForYear(users: TeamUser[], year: number): CalendarEvent[] {
  return users
    .filter((u) => u.birthDate)
    .map((u) => {
      const [, month, day] = u.birthDate!.split("-");
      return {
        id: `birthday_${u.id}_${year}`,
        calendarId: BIRTHDAYS_CALENDAR_ID,
        title: `🎂 ${u.shortName}`,
        date: `${year}-${month}-${day}`,
        description: "",
        createdBy: null,
        createdAt: "",
      };
    });
}
