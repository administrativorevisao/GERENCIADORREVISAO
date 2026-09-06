// Parsers de célula compartilhados por importadores de planilha (Equipe,
// Projetos...). O Financeiro tem sua própria cópia de parseDateCell em
// modules/financeiro/importParsers.ts — duplicado de propósito, para não
// arriscar mexer num importador já testado e em uso.
import { STANDARD_DEPARTMENTS } from "../../core/companies/companies";
import type { TeamUser } from "../../core/team/types";

function isValidDate(iso: string): boolean {
  const d = new Date(iso);
  return !Number.isNaN(d.getTime());
}

export function parseDateCell(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return isValidDate(s.slice(0, 10)) ? s.slice(0, 10) : null;
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const [, d, mo, yRaw] = m;
    const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
    const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    return isValidDate(iso) ? iso : null;
  }
  return null;
}

export function departmentIdFromName(name: unknown): string | null {
  const s = String(name || "").trim().toLowerCase();
  if (!s) return null;
  return STANDARD_DEPARTMENTS.find((d) => d.name.trim().toLowerCase() === s)?.id ?? null;
}

export function findUserByNameOrEmail(users: TeamUser[], nameOrEmail: string): TeamUser | null {
  const s = String(nameOrEmail || "").trim().toLowerCase();
  if (!s) return null;
  return (
    users.find((u) => u.email.trim().toLowerCase() === s) ??
    users.find((u) => u.name.trim().toLowerCase() === s) ??
    users.find((u) => u.shortName && u.shortName.trim().toLowerCase() === s) ??
    null
  );
}
