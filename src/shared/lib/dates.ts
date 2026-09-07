// Data local em "YYYY-MM-DD" — NÃO usar toISOString() aqui: ela converte
// para UTC, o que empurra a data para o dia seguinte à noite em fusos
// negativos (todo o Brasil), fazendo tarefas/prazos "de hoje" desaparecerem
// horas antes da meia-noite local.
function localDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return localDateISO(new Date());
}

export function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  return localDateISO(date);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export type DueStatus = "late" | "today" | "soon" | "ok" | "done";

export function dueStatus(dueDate: string | null | undefined, status: string): DueStatus {
  if (status === "done") return "done";
  if (!dueDate) return "ok";
  const today = todayISO();
  if (dueDate < today) return "late";
  if (dueDate === today) return "today";
  const soonThreshold = new Date();
  soonThreshold.setDate(soonThreshold.getDate() + 3);
  if (dueDate <= localDateISO(soonThreshold)) return "soon";
  return "ok";
}
