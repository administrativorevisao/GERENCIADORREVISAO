import type { SheetRow } from "../../shared/lib/googleSheets";
import { DRE_GROUPS, type DreGroup } from "./types";

// Diferente do app antigo (que guardava valores em centavos), aqui o valor
// já é o número decimal em reais direto — mesma convenção do resto do
// módulo Financeiro novo (FinanceTxn.amount etc.).
export function parseMoneyCell(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  let s = String(v).trim();
  // sinal pode vir antes do "R$" ("-R$ 594,40") ou entre parênteses ("(594,40)")
  const neg = /^-/.test(s) || /^\(.*\)$/.test(s);
  s = s.replace(/^-/, "").replace(/^\(|\)$/g, "").replace(/R\$\s?/gi, "").replace(/\s/g, "");
  if (!s) return null;
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = parseFloat(s);
  if (Number.isNaN(n)) return null;
  return neg ? -n : n;
}

function isValidDate(iso: string): boolean {
  const d = new Date(iso);
  return !Number.isNaN(d.getTime());
}

export function parseDateCell(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return isValidDate(s.slice(0, 10)) ? s.slice(0, 10) : null;
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const [, d, mo, yRaw] = m;
    const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
    const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    return isValidDate(iso) ? iso : null;
  }
  return null;
}

export function parseCompetenceCell(v: unknown): string | null {
  const iso = parseDateCell(v);
  return iso ? iso.slice(0, 7) : null;
}

export function dreGroupFromLabel(v: unknown): DreGroup | null {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return null;
  const hit = (Object.entries(DRE_GROUPS) as [DreGroup, string][]).find(([, label]) => label.toLowerCase() === s);
  if (hit) return hit[0];
  const byKey = (Object.keys(DRE_GROUPS) as DreGroup[]).find((k) => k.toLowerCase() === s);
  return byKey ?? null;
}

// Deriva o grupo do DRE a partir do texto de "Categoria (Centro de custo)" do
// razão financeiro real de alguns clientes (ex: Receita_Bruta, Custos_Sobre_
// Vendas, Deduções_e_Cancelamentos, Despesas_com_*). Categorias de despesa
// variadas caem todas em despesasOperacionais — os 4 grupos do DRE deste
// sistema são mais enxutos que os centros de custo da planilha.
export function dreGroupFromCentroCusto(v: unknown, isReceita: boolean): DreGroup {
  const s = String(v || "").toLowerCase();
  if (s.includes("receita")) return "receitaBruta";
  if (s.includes("dedu") || s.includes("cancelamento")) return "deducoes";
  if (s.includes("custo")) return "custos";
  if (s.includes("resultado_financeiro") || s.includes("resultado financeiro")) return isReceita ? "receitaBruta" : "despesasOperacionais";
  return "despesasOperacionais";
}

export function isLedgerFormat(row: SheetRow): boolean {
  return row["Categoria (Centro de custo)"] != null || row["Data de Competência"] != null || row["Data de Pagamento"] != null;
}
