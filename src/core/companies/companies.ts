export type CompanyId = "revisao" | "meq" | "mac" | "vnd";

export interface Company {
  id: CompanyId;
  name: string;
  sub: string;
  initials: string;
  accent: string;
}

// Empresas do grupo. Cada uma tem dados 100% isolados no banco via
// company_id + RLS (ver supabase/schema.sql) — não apenas visual.
export const COMPANIES: Company[] = [
  { id: "revisao", name: "Revisão", sub: "Ensino Jurídico", initials: "R", accent: "#3b0764" },
  { id: "meq", name: "MEQ", sub: "MEQ Concursos", initials: "M", accent: "#14213d" },
  { id: "mac", name: "MAC", sub: "Grupo Revisão", initials: "M", accent: "#7f1d3d" },
  { id: "vnd", name: "VND", sub: "Você na Defensoria", initials: "V", accent: "#2f9e4f" },
];

export function companyById(id: string | null | undefined): Company {
  return COMPANIES.find((c) => c.id === id) ?? COMPANIES[0];
}

// Setores padrão de cada empresa — usados tanto para a organização (Equipe)
// quanto para nomear os módulos por setor.
export interface Department {
  id: string;
  name: string;
  icon: string;
}
export const STANDARD_DEPARTMENTS: Department[] = [
  { id: "dep_dir", name: "Diretoria", icon: "🏛️" },
  { id: "dep_ped", name: "Pedagógico", icon: "📚" },
  { id: "dep_com", name: "Comercial", icon: "💼" },
  { id: "dep_mkt", name: "Marketing", icon: "📣" },
  { id: "dep_fin", name: "Financeiro", icon: "💰" },
  { id: "dep_adm", name: "Administrativo", icon: "⚙️" },
  { id: "dep_cs", name: "CS / CX", icon: "🎧" },
];
