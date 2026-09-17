import { useAuth } from "../../shared/auth/AuthContext";
import { isAdmin } from "../../shared/auth/types";
import { COMPANIES, type Company } from "./companies";
import { useUserCompanyIds } from "./userCompanies";

// Empresas que o usuário logado pode ver no seletor — admin vê as 4 (é o
// "admin do grupo", ver supabase/schema.sql); colaborador comum vê a
// própria empresa (Profile.companyId) mais qualquer uma extra cadastrada
// em user_companies (colaborador membro de mais de uma empresa).
export function useAccessibleCompanies(): Company[] {
  const { profile } = useAuth();
  const admin = isAdmin(profile);
  const { data: extra } = useUserCompanyIds(admin || !profile ? null : profile.id);

  if (admin) return COMPANIES;
  if (!profile) return [];
  const ids = new Set([profile.companyId, ...(extra ?? [])]);
  return COMPANIES.filter((c) => ids.has(c.id));
}
