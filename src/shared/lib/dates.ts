export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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
  if (dueDate <= soonThreshold.toISOString().slice(0, 10)) return "soon";
  return "ok";
}
