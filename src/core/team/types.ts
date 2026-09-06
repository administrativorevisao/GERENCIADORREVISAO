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
  roleId: string | null; // perfil de acesso (Role) atribuído a este colaborador — ver roles.ts
  allowedViews: string[] | null; // null = acesso padrão a tudo (exceto financeiro) — definido pelo Role
  financeAccess: boolean; // definido pelo Role
}
