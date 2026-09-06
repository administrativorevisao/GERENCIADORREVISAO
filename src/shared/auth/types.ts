export type UserRole = "admin" | "collaborator";

// Espelha public.users.data no Supabase (schema JSON-first — ver supabase/schema.sql).
export interface Profile {
  id: string;
  companyId: string;
  name: string;
  shortName: string;
  email: string;
  role: UserRole;
  jobTitle: string | null;
  departmentId: string | null;
  teamId: string | null;
  avatarImage: string | null;
  allowedViews: string[] | null; // null = acesso padrão total (exceto financeiro)
  financeAccess: boolean;
  birthDate: string | null; // "YYYY-MM-DD" — usado pelo calendário de aniversários (só mês/dia)
}

export function isAdmin(profile: Profile | null): boolean {
  return profile?.role === "admin";
}

export function canView(profile: Profile | null, viewId: string): boolean {
  if (!profile) return false;
  if (viewId === "financeiro") return isAdmin(profile) || profile.financeAccess;
  if (isAdmin(profile)) return true;
  if (!profile.allowedViews) return true;
  return profile.allowedViews.includes(viewId);
}
