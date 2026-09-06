export interface TeamUser {
  id: string;
  name: string;
  shortName: string;
  email: string;
  role: "admin" | "collaborator";
  jobTitle: string | null;
  departmentId: string | null;
  teamId: string | null;
  birthDate: string | null; // "MM-DD" ou "YYYY-MM-DD" — só mês/dia são usados para o calendário de aniversários
}
