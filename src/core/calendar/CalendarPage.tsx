import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext";
import { isAdmin } from "../../shared/auth/types";
import { useTasks, useUpdateTaskStatus } from "../tasks/useTasks";
import { STATUS_LABEL, STATUSES, type Task } from "../tasks/types";
import { userName, useUsers } from "../team/useUsers";
import { usePrograms, useProjects } from "../projects/useProjects";
import { STANDARD_DEPARTMENTS } from "../companies/companies";
import { dueStatus, fmtDate, todayISO } from "../../shared/lib/dates";
import { useCalendarEvents, useCalendars, useRemoveCalendarEvent } from "../calendars/useCalendars";
import { useLayerPrefs } from "../calendars/useLayerPrefs";
import { birthdayEventsForYear } from "../calendars/birthdays";
import { BIRTHDAYS_CALENDAR_ID } from "../calendars/types";
import { CalendarFormModal } from "../calendars/CalendarFormModal";
import { EventFormModal } from "../calendars/EventFormModal";

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
type CalMode = "month" | "week" | "day" | "kanban" | "table";
const TASKS_LAYER = "tasks";

interface CalItem {
  id: string;
  title: string;
  date: string;
  color: string;
  link: string;
  origin: string;
  task?: Task;
}

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
  const { data: tasks, isLoading: loadingTasks } = useTasks();
  const { data: users } = useUsers();
  const { data: projects } = useProjects();
  const { data: programs } = usePrograms();
  const { data: calendars, isLoading: loadingCalendars } = useCalendars();
  const { data: calEvents } = useCalendarEvents();
  const removeEvent = useRemoveCalendarEvent();

  const [cursor, setCursor] = useState(() => todayISO());
  const [mode, setMode] = useState<CalMode>("month");
  const [deptScope, setDeptScope] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [creatingCalendar, setCreatingCalendar] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState<string | null>(null);

  const admin = isAdmin(profile);
  const visibleDepts = admin
    ? STANDARD_DEPARTMENTS
    : STANDARD_DEPARTMENTS.filter((d) => d.id === profile?.departmentId);

  const layerDefaults = useMemo(() => {
    const map: Record<string, string> = { [TASKS_LAYER]: "#3b0764" };
    (calendars ?? []).forEach((c) => { map[c.id] = c.color; });
    return map;
  }, [calendars]);
  const layerPrefs = useLayerPrefs(layerDefaults);

  const filteredTasks = useMemo(() => {
    let list = tasks ?? [];
    if (deptScope) list = list.filter((t) => t.departmentId === deptScope);
    if (projectFilter) list = list.filter((t) => t.projectId === projectFilter);
    if (onlyMine) list = list.filter((t) => t.responsibleId === profile?.id);
    return list;
  }, [tasks, deptScope, projectFilter, onlyMine, profile?.id]);

  const cursorDate = parseISO(cursor);
  const birthdayEvents = useMemo(
    () => [
      ...birthdayEventsForYear(users ?? [], cursorDate.getFullYear()),
      ...birthdayEventsForYear(users ?? [], cursorDate.getFullYear() - 1),
      ...birthdayEventsForYear(users ?? [], cursorDate.getFullYear() + 1),
    ],
    [users, cursorDate],
  );

  const items = useMemo(() => {
    const result: CalItem[] = [];
    if (layerPrefs.get(TASKS_LAYER).visible) {
      const color = layerPrefs.get(TASKS_LAYER).color;
      filteredTasks.forEach((t) => {
        if (!t.dueDate) return;
        const late = t.status !== "done" && dueStatus(t.dueDate, t.status) === "late";
        result.push({ id: t.id, title: t.title, date: t.dueDate.slice(0, 10), color: late ? "#dc2626" : color, link: t.projectId ? `/projetos/${t.projectId}` : "/tarefas", origin: "Tarefa", task: t });
      });
    }
    (calendars ?? []).forEach((cal) => {
      const pref = layerPrefs.get(cal.id);
      if (!pref.visible) return;
      if (cal.id === BIRTHDAYS_CALENDAR_ID) {
        birthdayEvents.forEach((e) => result.push({ id: e.id, title: e.title, date: e.date, color: pref.color, link: "/calendario", origin: cal.name }));
      } else {
        (calEvents ?? []).filter((e) => e.calendarId === cal.id).forEach((e) => {
          result.push({ id: e.id, title: e.title, date: e.date, color: pref.color, link: "/calendario", origin: cal.name });
        });
      }
    });
    return result;
  }, [filteredTasks, calendars, calEvents, birthdayEvents, layerPrefs]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    items.forEach((it) => {
      if (!map.has(it.date)) map.set(it.date, []);
      map.get(it.date)!.push(it);
    });
    return map;
  }, [items]);

  if (loadingTasks || loadingCalendars) return <div className="empty">Carregando calendário…</div>;

  function navigate(dir: 1 | -1) {
    if (mode === "day") setCursor((c) => addDaysISO(c, dir));
    else if (mode === "week" || mode === "kanban") setCursor((c) => addDaysISO(c, dir * 7));
    else {
      const d = parseISO(cursor);
      d.setMonth(d.getMonth() + dir);
      setCursor(toISO(d));
    }
  }

  const title =
    mode === "day"
      ? fmtDate(cursor)
      : mode === "week" || mode === "kanban"
        ? `Semana de ${fmtDate(weekStartOf(cursor))}`
        : cursorDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="row" style={{ gap: 16, alignItems: "flex-start", flexWrap: "nowrap" }}>
      <aside className="card card-pad" style={{ width: 230, flex: "none" }}>
        <button className="btn primary sm" style={{ width: "100%", marginBottom: 16 }} onClick={() => setCreatingEvent(todayISO())}>
          + Novo evento
        </button>

        <div className="section-title" style={{ fontSize: 12.5 }}>Tarefas</div>
        <label className="row" style={{ alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 8 }}>
          <input type="checkbox" checked={layerPrefs.get(TASKS_LAYER).visible} onChange={() => layerPrefs.toggleVisible(TASKS_LAYER)} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: layerPrefs.get(TASKS_LAYER).color, flex: "none" }} />
          <span style={{ fontSize: 13 }}>Mostrar tarefas</span>
        </label>
        <div className="field">
          <select className="input" style={{ fontSize: 12.5, padding: "6px 8px" }} value={deptScope} onChange={(e) => setDeptScope(e.target.value)}>
            <option value="">Geral (todos os setores)</option>
            {visibleDepts.map((d) => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
          </select>
        </div>
        <div className="field">
          <select className="input" style={{ fontSize: 12.5, padding: "6px 8px" }} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">Todos os projetos</option>
            {(projects ?? []).map((p) => {
              const prog = (programs ?? []).find((pr) => pr.id === p.programId);
              return <option key={p.id} value={p.id}>{prog ? `${prog.name} · ` : ""}{p.name}</option>;
            })}
          </select>
        </div>
        <label className="row" style={{ alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12.5 }}>
          <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
          Somente minhas tarefas
        </label>

        <div className="divider" />

        <div className="section-title" style={{ fontSize: 12.5 }}>
          Minhas agendas
          {admin && (
            <button className="btn sm ghost" style={{ marginLeft: "auto", padding: "2px 8px" }} onClick={() => setCreatingCalendar(true)} title="Novo calendário">+</button>
          )}
        </div>
        {(calendars ?? []).map((cal) => {
          const pref = layerPrefs.get(cal.id);
          return (
            <div key={cal.id} className="row" style={{ alignItems: "center", gap: 8, marginBottom: 6 }}>
              <label className="row" style={{ alignItems: "center", gap: 8, cursor: "pointer", flex: 1 }}>
                <input type="checkbox" checked={pref.visible} onChange={() => layerPrefs.toggleVisible(cal.id)} />
                <input
                  type="color"
                  value={pref.color}
                  onChange={(e) => layerPrefs.setColor(cal.id, e.target.value)}
                  title="Personalizar cor (só para você)"
                  style={{ width: 16, height: 16, border: "none", padding: 0, background: "none", flex: "none" }}
                />
                <span style={{ fontSize: 13 }}>{cal.name}</span>
              </label>
            </div>
          );
        })}
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="toolbar">
          {mode !== "table" ? (
            <>
              <button className="btn sm" onClick={() => navigate(-1)}>‹</button>
              <button className="btn sm" onClick={() => setCursor(todayISO())}>Hoje</button>
              <button className="btn sm" onClick={() => navigate(1)}>›</button>
              <b style={{ margin: "0 6px", textTransform: "capitalize" }}>{title}</b>
            </>
          ) : (
            <b style={{ margin: "0 6px" }}>Todas as atividades</b>
          )}
          <div className="seg" style={{ marginLeft: "auto" }}>
            {MODES.map((m) => (
              <button key={m.id} className={mode === m.id ? "on" : ""} onClick={() => setMode(m.id)}>{m.label}</button>
            ))}
          </div>
        </div>

        {mode === "month" && <MonthView cursor={cursor} itemsByDate={itemsByDate} />}
        {mode === "week" && <WeekView weekStart={weekStartOf(cursor)} itemsByDate={itemsByDate} />}
        {mode === "day" && <DayView day={cursor} itemsByDate={itemsByDate} users={users} onRemoveEvent={(id) => removeEvent.mutate(id)} />}
        {mode === "kanban" && <KanbanDayView weekStart={weekStartOf(cursor)} itemsByDate={itemsByDate} users={users} />}
        {mode === "table" && <TableView items={items} users={users} />}
      </div>

      {creatingCalendar && <CalendarFormModal onClose={() => setCreatingCalendar(false)} />}
      {creatingEvent && <EventFormModal calendars={calendars ?? []} defaultDate={creatingEvent} onClose={() => setCreatingEvent(null)} />}
    </div>
  );
}

function ItemLink({ item }: { item: CalItem }) {
  return (
    <Link
      to={item.link}
      className="cal-ev"
      style={{ background: item.color }}
      title={item.task ? `${item.title} — ${STATUS_LABEL[item.task.status]}` : item.title}
    >
      {item.title}
    </Link>
  );
}

function MonthView({ cursor, itemsByDate }: { cursor: string; itemsByDate: Map<string, CalItem[]> }) {
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
          const dayItems = itemsByDate.get(iso) ?? [];
          return (
            <div className={`cal-cell ${iso === today ? "today" : ""}`} key={i}>
              <div className="dn">{date.getDate()}</div>
              {dayItems.slice(0, 3).map((it) => <ItemLink item={it} key={it.id} />)}
              {dayItems.length > 3 && <div className="cal-more">+{dayItems.length - 3}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ weekStart, itemsByDate }: { weekStart: string; itemsByDate: Map<string, CalItem[]> }) {
  const today = todayISO();
  const days = [...Array(7)].map((_, i) => addDaysISO(weekStart, i));
  return (
    <div className="card card-pad">
      <div className="cal-grid">
        {days.map((iso, i) => {
          const dayItems = itemsByDate.get(iso) ?? [];
          return (
            <div className="cal-cell" style={{ minHeight: 180 }} key={iso}>
              <div className="row" style={{ justifyContent: "space-between", width: "100%" }}>
                <b style={{ fontSize: 12 }}>{DOW[i]}</b>
                <span className="dn" style={{ color: iso === today ? "var(--accent-text)" : undefined }}>{fmtDate(iso).slice(0, 5)}</span>
              </div>
              {dayItems.length === 0 && <span className="muted" style={{ fontSize: 11 }}>—</span>}
              {dayItems.map((it) => <ItemLink item={it} key={it.id} />)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({ day, itemsByDate, users, onRemoveEvent }: { day: string; itemsByDate: Map<string, CalItem[]>; users: ReturnType<typeof useUsers>["data"]; onRemoveEvent: (id: string) => void }) {
  const dayItems = itemsByDate.get(day) ?? [];
  return (
    <div className="card card-pad">
      <div className="section-title">{fmtDate(day)} <span className="count">{dayItems.length} atividade(s)</span></div>
      {dayItems.length === 0 && <div className="empty">Nenhuma atividade neste dia.</div>}
      {dayItems.map((it) => (
        <div className="list-item" key={it.id}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: it.color, flex: "none" }} />
          <div className="stack" style={{ flex: 1 }}>
            <Link to={it.link}><b style={{ fontSize: 13.5 }}>{it.title}</b></Link>
            {it.task && <span className="muted" style={{ fontSize: 11.5 }}>{userName(users, it.task.responsibleId)}</span>}
          </div>
          {it.task && <span className="badge b-soft">{STATUS_LABEL[it.task.status]}</span>}
          {!it.task && (
            <button className="btn sm ghost" onClick={() => onRemoveEvent(it.id)} title="Remover evento">
              <span className="msi">delete</span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function KanbanDayView({ weekStart, itemsByDate, users }: { weekStart: string; itemsByDate: Map<string, CalItem[]>; users: ReturnType<typeof useUsers>["data"] }) {
  const today = todayISO();
  const days = [...Array(7)].map((_, i) => addDaysISO(weekStart, i));
  const updateStatus = useUpdateTaskStatus();
  return (
    <div style={{ overflowX: "auto" }}>
      <div className="kanban" style={{ gridTemplateColumns: "repeat(7, minmax(220px, 1fr))", minWidth: 1540 }}>
        {days.map((iso, i) => {
          const dayItems = itemsByDate.get(iso) ?? [];
          return (
            <div className="kcol" key={iso}>
              <div className="kcol-head">
                <span className={`badge ${iso === today ? "b-doing" : "b-soft"}`}>{DOW[i]} {fmtDate(iso).slice(0, 5)}</span>
                <span className="n">{dayItems.length}</span>
              </div>
              <div className="kcol-body">
                {dayItems.length === 0 && <div className="muted" style={{ textAlign: "center", padding: 14, fontSize: 12 }}>Vazio</div>}
                {dayItems.map((it) => (
                  <div className="kcard" style={{ borderLeftColor: it.color }} key={it.id}>
                    <Link to={it.link} className="kt" style={{ display: "block" }}>{it.title}</Link>
                    {it.task && (
                      <>
                        <div className="kfoot">{userName(users, it.task.responsibleId)}</div>
                        <div className="kmove">
                          {STATUSES.filter((s) => s !== it.task!.status).map((s) => (
                            <button key={s} className="btn sm" onClick={() => updateStatus.mutate({ task: it.task!, status: s })}>
                              {STATUS_LABEL[s]}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
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

function TableView({ items, users }: { items: CalItem[]; users: ReturnType<typeof useUsers>["data"] }) {
  const sorted = items.slice().sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="tbl-wrap">
      <table className="data">
        <thead>
          <tr><th>Título</th><th>Origem</th><th>Status</th><th>Responsável</th><th>Data</th></tr>
        </thead>
        <tbody>
          {sorted.length === 0 && <tr><td colSpan={5}><div className="empty">Nenhum registro encontrado.</div></td></tr>}
          {sorted.map((it) => (
            <tr key={it.id}>
              <td>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: it.color, display: "inline-block", marginRight: 6 }} />
                <Link to={it.link}><b>{it.title}</b></Link>
              </td>
              <td>{it.origin}</td>
              <td>{it.task ? <span className="badge b-soft">{STATUS_LABEL[it.task.status]}</span> : "—"}</td>
              <td>{it.task ? userName(users, it.task.responsibleId) : "—"}</td>
              <td><span className={`badge ${it.task ? `b-${dueStatus(it.date, it.task.status)}` : "b-soft"}`}>{fmtDate(it.date)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
