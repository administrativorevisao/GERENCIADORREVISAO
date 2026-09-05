import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext";
import { isAdmin } from "../../shared/auth/types";
import { useTasks, useUpdateTaskStatus } from "../tasks/useTasks";
import { STATUS_LABEL, STATUSES, type Task } from "../tasks/types";
import { userName, useUsers } from "../team/useUsers";
import { STANDARD_DEPARTMENTS } from "../companies/companies";
import { dueStatus, fmtDate, todayISO } from "../../shared/lib/dates";

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
type CalMode = "month" | "week" | "day" | "kanban" | "table";

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}
function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDaysISO(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
function weekStartOf(iso: string): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() - d.getDay());
  return toISO(d);
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

const MODES: { id: CalMode; label: string }[] = [
  { id: "month", label: "Mês" },
  { id: "week", label: "Semana" },
  { id: "day", label: "Dia" },
  { id: "kanban", label: "Kanban" },
  { id: "table", label: "Tabela" },
];

export function CalendarPage() {
  const { profile } = useAuth();
  const { data: tasks, isLoading } = useTasks();
  const { data: users } = useUsers();
  const [cursor, setCursor] = useState(() => todayISO());
  const [scope, setScope] = useState<string>("");
  const [mode, setMode] = useState<CalMode>("month");

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

  function navigate(dir: 1 | -1) {
    if (mode === "day") setCursor((c) => addDaysISO(c, dir));
    else if (mode === "week" || mode === "kanban") setCursor((c) => addDaysISO(c, dir * 7));
    else {
      const d = parseISO(cursor);
      d.setMonth(d.getMonth() + dir);
      setCursor(toISO(d));
    }
  }

  const cursorDate = parseISO(cursor);
  const title =
    mode === "day"
      ? fmtDate(cursor)
      : mode === "week" || mode === "kanban"
        ? `Semana de ${fmtDate(weekStartOf(cursor))}`
        : cursorDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="row" style={{ flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        <button className={`btn sm ${scope === "" ? "primary" : "ghost"}`} onClick={() => setScope("")}>
          <span className="msi">public</span> Geral
        </button>
        {visibleDepts.map((d) => (
          <button key={d.id} className={`btn sm ${scope === d.id ? "primary" : "ghost"}`} onClick={() => setScope(d.id)}>
            {d.icon} {d.name}
          </button>
        ))}
      </div>

      <div className="toolbar">
        {mode !== "table" ? (
          <>
            <button className="btn sm" onClick={() => navigate(-1)}>‹</button>
            <button className="btn sm" onClick={() => setCursor(todayISO())}>Hoje</button>
            <button className="btn sm" onClick={() => navigate(1)}>›</button>
            <b style={{ margin: "0 6px", textTransform: "capitalize" }}>{title}</b>
          </>
        ) : (
          <b style={{ margin: "0 6px" }}>Todas as atividades{scope ? ` · ${STANDARD_DEPARTMENTS.find((d) => d.id === scope)?.name}` : ""}</b>
        )}
        <div className="seg" style={{ marginLeft: "auto" }}>
          {MODES.map((m) => (
            <button key={m.id} className={mode === m.id ? "on" : ""} onClick={() => setMode(m.id)}>{m.label}</button>
          ))}
        </div>
      </div>

      {mode === "month" && <MonthView cursor={cursor} tasksByDate={tasksByDate} />}
      {mode === "week" && <WeekView weekStart={weekStartOf(cursor)} tasksByDate={tasksByDate} />}
      {mode === "day" && <DayView day={cursor} tasksByDate={tasksByDate} users={users} />}
      {mode === "kanban" && <KanbanDayView weekStart={weekStartOf(cursor)} tasksByDate={tasksByDate} users={users} />}
      {mode === "table" && <TableView tasks={scoped} users={users} />}
    </div>
  );
}

function eventLink(t: Task) {
  return t.projectId ? `/projetos/${t.projectId}` : "/tarefas";
}

function evClass(t: Task): string {
  if (t.status !== "done" && dueStatus(t.dueDate, t.status) === "late") return "ev-late";
  return `ev-${t.type}`;
}

function MonthView({ cursor, tasksByDate }: { cursor: string; tasksByDate: Map<string, Task[]> }) {
  const cursorDate = parseISO(cursor);
  const weeks = monthMatrix(cursorDate.getFullYear(), cursorDate.getMonth());
  const today = todayISO();
  return (
    <div className="card card-pad">
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
                <Link key={t.id} to={eventLink(t)} className={`cal-ev ${evClass(t)}`} title={`${t.title} — ${STATUS_LABEL[t.status]}`}>
                  {t.title}
                </Link>
              ))}
              {dayTasks.length > 3 && <div className="cal-more">+{dayTasks.length - 3}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ weekStart, tasksByDate }: { weekStart: string; tasksByDate: Map<string, Task[]> }) {
  const today = todayISO();
  const days = [...Array(7)].map((_, i) => addDaysISO(weekStart, i));
  return (
    <div className="card card-pad">
      <div className="cal-grid">
        {days.map((iso, i) => {
          const dayTasks = tasksByDate.get(iso) ?? [];
          return (
            <div className="cal-cell" style={{ minHeight: 180 }} key={iso}>
              <div className="row" style={{ justifyContent: "space-between", width: "100%" }}>
                <b style={{ fontSize: 12 }}>{DOW[i]}</b>
                <span className="dn" style={{ color: iso === today ? "var(--accent-text)" : undefined }}>{fmtDate(iso).slice(0, 5)}</span>
              </div>
              {dayTasks.length === 0 && <span className="muted" style={{ fontSize: 11 }}>—</span>}
              {dayTasks.map((t) => (
                <Link key={t.id} to={eventLink(t)} className={`cal-ev ${evClass(t)}`}>{t.title}</Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({ day, tasksByDate, users }: { day: string; tasksByDate: Map<string, Task[]>; users: ReturnType<typeof useUsers>["data"] }) {
  const dayTasks = tasksByDate.get(day) ?? [];
  return (
    <div className="card card-pad">
      <div className="section-title">{fmtDate(day)} <span className="count">{dayTasks.length} atividade(s)</span></div>
      {dayTasks.length === 0 && <div className="empty">Nenhuma atividade neste dia.</div>}
      {dayTasks.map((t) => (
        <div className="list-item" key={t.id}>
          <div className="stack" style={{ flex: 1 }}>
            <Link to={eventLink(t)}><b style={{ fontSize: 13.5 }}>{t.title}</b></Link>
            <span className="muted" style={{ fontSize: 11.5 }}>{userName(users, t.responsibleId)}</span>
          </div>
          <span className="badge b-soft">{STATUS_LABEL[t.status]}</span>
          <span className={`badge b-${dueStatus(t.dueDate, t.status)}`}>{fmtDate(t.dueDate)}</span>
        </div>
      ))}
    </div>
  );
}

function KanbanDayView({ weekStart, tasksByDate, users }: { weekStart: string; tasksByDate: Map<string, Task[]>; users: ReturnType<typeof useUsers>["data"] }) {
  const today = todayISO();
  const days = [...Array(7)].map((_, i) => addDaysISO(weekStart, i));
  const updateStatus = useUpdateTaskStatus();
  return (
    <div style={{ overflowX: "auto" }}>
      <div className="kanban" style={{ gridTemplateColumns: "repeat(7, minmax(220px, 1fr))", minWidth: 1540 }}>
        {days.map((iso, i) => {
          const dayTasks = tasksByDate.get(iso) ?? [];
          return (
            <div className="kcol" key={iso}>
              <div className="kcol-head">
                <span className={`badge ${iso === today ? "b-doing" : "b-soft"}`}>{DOW[i]} {fmtDate(iso).slice(0, 5)}</span>
                <span className="n">{dayTasks.length}</span>
              </div>
              <div className="kcol-body">
                {dayTasks.length === 0 && <div className="muted" style={{ textAlign: "center", padding: 14, fontSize: 12 }}>Vazio</div>}
                {dayTasks.map((t) => (
                  <div className="kcard" data-prio={t.priority} key={t.id}>
                    <Link to={eventLink(t)} className="kt" style={{ display: "block" }}>{t.title}</Link>
                    <div className="kfoot">{userName(users, t.responsibleId)}</div>
                    <div className="kmove">
                      {STATUSES.filter((s) => s !== t.status).map((s) => (
                        <button key={s} className="btn sm" onClick={() => updateStatus.mutate({ task: t, status: s })}>
                          {STATUS_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TableView({ tasks, users }: { tasks: Task[]; users: ReturnType<typeof useUsers>["data"] }) {
  const sorted = tasks.slice().sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  return (
    <div className="tbl-wrap">
      <table className="data">
        <thead>
          <tr><th>Título</th><th>Tipo</th><th>Status</th><th>Responsável</th><th>Prazo</th></tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr><td colSpan={5}><div className="empty">Nenhum registro encontrado.</div></td></tr>
          )}
          {sorted.map((t) => (
            <tr key={t.id}>
              <td><Link to={eventLink(t)}><b>{t.title}</b></Link></td>
              <td>{t.type}</td>
              <td><span className="badge b-soft">{STATUS_LABEL[t.status]}</span></td>
              <td>{userName(users, t.responsibleId)}</td>
              <td><span className={`badge b-${dueStatus(t.dueDate, t.status)}`}>{fmtDate(t.dueDate)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
