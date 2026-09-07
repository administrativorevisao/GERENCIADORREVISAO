import { useState } from "react";
import { todayISO } from "../lib/dates";

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export interface MiniCalendarItem {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  color?: string;
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function monthMatrix(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// Calendário de mês reutilizável e independente do Calendário principal —
// para módulos que precisam de "mais uma visualização" (Tabela/Kanban/
// Calendário) sem depender do estado/rotas do core/calendar. Recebe uma
// lista plana de itens já resolvidos (id/title/date) e agrupa por dia.
export function MiniMonthCalendar({ items, onItemClick }: { items: MiniCalendarItem[]; onItemClick?: (id: string) => void }) {
  const [cursor, setCursor] = useState(() => todayISO().slice(0, 8) + "01");
  const cursorDate = parseISO(cursor);
  const weeks = monthMatrix(cursorDate.getFullYear(), cursorDate.getMonth());
  const today = todayISO();

  const itemsByDate = new Map<string, MiniCalendarItem[]>();
  for (const item of items) {
    if (!item.date) continue;
    const arr = itemsByDate.get(item.date) ?? [];
    arr.push(item);
    itemsByDate.set(item.date, arr);
  }

  function navigate(dir: 1 | -1) {
    const d = parseISO(cursor);
    d.setMonth(d.getMonth() + dir);
    setCursor(toISO(d));
  }

  return (
    <div className="card card-pad">
      <div className="row" style={{ alignItems: "center", marginBottom: 10 }}>
        <button className="btn sm ghost" onClick={() => navigate(-1)}><span className="msi">chevron_left</span></button>
        <b style={{ margin: "0 8px" }}>{cursorDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</b>
        <button className="btn sm ghost" onClick={() => navigate(1)}><span className="msi">chevron_right</span></button>
      </div>
      <div className="cal-grid">
        {DOW.map((d) => <div className="cal-dow" key={d}>{d}</div>)}
        {weeks.flat().map((date, i) => {
          if (!date) return <div className="cal-cell out" key={i} />;
          const iso = toISO(date);
          const dayItems = itemsByDate.get(iso) ?? [];
          return (
            <div className={`cal-cell ${iso === today ? "today" : ""}`} key={i}>
              <div className="dn">{date.getDate()}</div>
              {dayItems.slice(0, 3).map((it) => (
                <button
                  key={it.id}
                  className="cal-ev"
                  style={{ background: it.color ?? "var(--primary, #7c3aed)", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}
                  onClick={() => onItemClick?.(it.id)}
                >
                  {it.title}
                </button>
              ))}
              {dayItems.length > 3 && <div className="cal-more">+{dayItems.length - 3}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
