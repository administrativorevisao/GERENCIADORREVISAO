import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext";
import { isAdmin } from "../../shared/auth/types";
import { useTasks } from "../tasks/useTasks";
import { STATUS_LABEL, type Task } from "../tasks/types";
import { STANDARD_DEPARTMENTS } from "../companies/companies";
import { fmtDate, todayISO } from "../../shared/lib/dates";

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function CalendarPage() {
  const { profile } = useAuth();
  const { data: tasks, isLoading } = useTasks();
  const [cursor, setCursor] = useState(() => new Date());
  const [scope, setScope] = useState<string>("");

  const admin = isAdmin(profile);
  const visibleDepts = admin
    ? STANDARD_DEPARTMENTS
    : STANDARD_DEPARTMENTS.filter((d) => d.id === profile?.departmentId);

  const scoped = useMemo(() => {
    const list = tasks ?? [];
    return scope ? list.filter((t) => t.departmentId === scope) : list;
  }, [tasks, scope]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    scoped.forEach((t) => {
      const key = (t.dueDate || "").slice(0, 10);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [scoped]);

  if (isLoading) return <div className="empty">Carregando calendário…</div>;

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const weeks = monthMatrix(year, month);
  const today = todayISO();
  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>
          <span className="msi">calendar_month</span> Calendário
        </div>
        <span style={{ flex: 1 }} />
        <div className="seg">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))}><span className="msi">chevron_left</span></button>
          <button onClick={() => setCursor(new Date())}>Hoje</button>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))}><span className="msi">chevron_right</span></button>
        </div>
      </div>

      <div className="seg" style={{ marginBottom: 14 }}>
        <button className={scope === "" ? "on" : ""} onClick={() => setScope("")}>Geral</button>
        {visibleDepts.map((d) => (
          <button key={d.id} className={scope === d.id ? "on" : ""} onClick={() => setScope(d.id)}>
            {d.icon} {d.name}
          </button>
        ))}
      </div>

      <div style={{ textTransform: "capitalize", fontWeight: 700, marginBottom: 10 }}>{monthLabel}</div>

      <div className="cal-grid">
        {DOW.map((d) => <div className="cal-dow" key={d}>{d}</div>)}
        {weeks.flat().map((date, i) => {
          if (!date) return <div className="cal-cell out" key={i} />;
          const iso = toISO(date);
          const dayTasks = tasksByDate.get(iso) ?? [];
          return (
            <div className={`cal-cell ${iso === today ? "today" : ""}`} key={i}>
              <div className="dn">{date.getDate()}</div>
              {dayTasks.slice(0, 3).map((t) => (
                <Link
                  key={t.id}
                  to={t.projectId ? `/projetos/${t.projectId}` : "/tarefas"}
                  className={`cal-ev ev-${t.type}`}
                  title={`${t.title} — ${STATUS_LABEL[t.status]}`}
                >
                  {t.title}
                </Link>
              ))}
              {dayTasks.length > 3 && <div className="cal-more">+{dayTasks.length - 3}</div>}
            </div>
          );
        })}
      </div>

      <p className="muted" style={{ marginTop: 14, fontSize: 12 }}>
        Mostrando por data de prazo (dueDate). Visualizações Semana/Dia/Kanban/Tabela do app antigo entram numa próxima leva — hoje: <b>{fmtDate(today)}</b>.
      </p>
    </div>
  );
}
