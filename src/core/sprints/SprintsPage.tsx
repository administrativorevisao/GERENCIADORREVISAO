import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addDaysISO, fmtDate, todayISO } from "../../shared/lib/dates";
import { MiniMonthCalendar, type MiniCalendarItem } from "../../shared/ui/MiniMonthCalendar";
import { useTasks } from "../tasks/useTasks";
import type { Task } from "../tasks/types";
import { usePrograms, useProjects } from "../projects/useProjects";
import { MODALIDADE_LABEL, MODALIDADES_PRECO_DUPLO, type Modalidade, type Program, type Project } from "../projects/types";

// Dashboard dos Sprints (Sprint Final, Sprintoria…) — não é uma entidade
// nova: um "sprint" é um Projeto cujo nome ou programa contém "sprint". A
// fase é sempre CALCULADA a partir das datas do curso (início das vendas,
// início do cronograma, Data da prova chave e fim do acesso = prova + 15),
// nunca guardada — assim a tela nunca fica desatualizada.

type Phase = "planejamento" | "vendas" | "curso" | "acesso" | "encerrado";
const PHASES: Phase[] = ["planejamento", "vendas", "curso", "acesso", "encerrado"];
const PHASE_LABEL: Record<Phase, string> = {
  planejamento: "Planejamento",
  vendas: "Em vendas",
  curso: "Em curso",
  acesso: "Pós-prova (acesso)",
  encerrado: "Encerrado",
};
const PHASE_COLOR: Record<Phase, string> = {
  planejamento: "var(--st-todo)",
  vendas: "var(--pr-medium)",
  curso: "var(--st-doing)",
  acesso: "var(--pr-low)",
  encerrado: "var(--st-done)",
};

const CAL_COLOR = {
  vendas: "#d97706",
  inicio: "#2563eb",
  prova: "#dc2626",
  acesso: "#0891b2",
} as const;

// Tipo de prova do sprint — sai da Modalidade do curso; "Pré-edital" vem do
// Tipo de curso (aba Guias) e tem precedência, porque um pré-edital ainda
// não tem prova definida. Tipo de curso também serve de fallback quando a
// modalidade não foi preenchida.
type TipoProva = "objetiva" | "obj_disc" | "discursiva" | "oral" | "pre_edital" | "sem_tipo";
const TIPOS_PROVA: TipoProva[] = ["objetiva", "obj_disc", "discursiva", "oral", "pre_edital", "sem_tipo"];
const TIPO_PROVA_LABEL: Record<TipoProva, string> = {
  objetiva: "Objetiva",
  obj_disc: "Objetiva + Discursiva",
  discursiva: "Discursiva",
  oral: "Oral",
  pre_edital: "Pré-edital",
  sem_tipo: "Sem tipo definido",
};
const TIPO_PROVA_COLOR: Record<TipoProva, string> = {
  objetiva: "#2563eb",
  obj_disc: "#7c3aed",
  discursiva: "#d97706",
  oral: "#db2777",
  pre_edital: "#0891b2",
  sem_tipo: "#64748b",
};

function tipoProva(project: Project): TipoProva {
  if (project.courseType === "pre_edital") return "pre_edital";
  switch (project.course.modalidades) {
    case "objetiva": return "objetiva";
    case "objetiva_discursiva_com_sem_correcao":
    case "objetiva_discursiva_sem_correcao": return "obj_disc";
    case "discursiva_com_sem_correcao": return "discursiva";
    case "prova_oral_online":
    case "prova_oral_online_presencial": return "oral";
  }
  switch (project.courseType) {
    case "discursiva": return "discursiva";
    case "oral": return "oral";
    case "edital_aberto":
    case "edital_aberto_completo": return "obj_disc";
  }
  return "sem_tipo";
}

// Datas de prova de um sprint: a Data da prova chave + as datas do
// Cronograma completo do curso cujo rótulo fala de prova (ex: "Prova
// objetiva", "Discursiva", "Prova oral") — assim sprints com 1ª e 2ª fase
// aparecem com as duas datas.
const PROVA_LABEL_RE = /prova|objetiva|discursiva|escrita|oral/i;
interface ProvaEvent {
  key: string;
  row: SprintRow;
  date: string;
  label: string;
  chave: boolean;
}
function provaEvents(row: SprintRow): ProvaEvent[] {
  const out: ProvaEvent[] = [];
  if (row.prova) out.push({ key: `${row.project.id}|chave`, row, date: row.prova, label: "Prova chave", chave: true });
  for (const item of row.project.course.cronogramaCompleto ?? []) {
    if (!item.date || !PROVA_LABEL_RE.test(item.label)) continue;
    if (item.date === row.prova) continue;
    out.push({ key: `${row.project.id}|${item.id}`, row, date: item.date, label: item.label, chave: false });
  }
  return out;
}

type SubView = "provas" | "table" | "kanban" | "calendar";
const SUB_VIEWS: { id: SubView; label: string }[] = [
  { id: "provas", label: "Provas" },
  { id: "table", label: "Tabela" },
  { id: "kanban", label: "Kanban" },
  { id: "calendar", label: "Calendário" },
];

interface SprintRow {
  project: Project;
  program: Program | null;
  phase: Phase;
  tipo: TipoProva;
  coordenador: string;
  modalidade: Modalidade | "";
  inicioVendas: string | null;
  inicioCronograma: string | null;
  prova: string | null;
  fimAcesso: string | null;
  daysToProva: number | null;
  tasksTotal: number;
  tasksDone: number;
  tasksLate: number;
  missing: string[];
}

function daysBetween(fromISO: string, toISO: string): number {
  const [y1, m1, d1] = fromISO.split("-").map(Number);
  const [y2, m2, d2] = toISO.split("-").map(Number);
  return Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86_400_000);
}

function isSprint(project: Project, program: Program | null): boolean {
  return /sprint/i.test(project.name) || /sprint/i.test(program?.name ?? "");
}

function computePhase(project: Project, today: string, inicioVendas: string | null, inicioCronograma: string | null, prova: string | null, fimAcesso: string | null): Phase {
  if (project.status === "done") return "encerrado";
  if (fimAcesso && today > fimAcesso) return "encerrado";
  if (prova && today > prova) return "acesso";
  if (inicioCronograma && today >= inicioCronograma) return "curso";
  if (inicioVendas && today >= inicioVendas) return "vendas";
  return "planejamento";
}

function missingFields(project: Project): string[] {
  const c = project.course;
  const out: string[] = [];
  if (!c.dataProvaChave) out.push("Data da prova");
  if (!c.inicioVendas) out.push("Início das vendas");
  if (!c.modalidades) out.push("Modalidade");
  if (!c.estruturaCurso?.coordenacao?.coordenador?.trim()) out.push("Coordenador");
  const dual = Boolean(c.modalidades) && MODALIDADES_PRECO_DUPLO.includes(c.modalidades as Modalidade);
  const temPreco = dual
    ? Boolean(c.oferta?.precoComCorrecao?.aVista?.trim() || c.oferta?.precoSemCorrecao?.aVista?.trim())
    : Boolean(c.oferta?.preco?.aVista?.trim());
  if (!temPreco) out.push("Preço");
  if (!project.briefing.content.trim()) out.push("Briefing");
  return out;
}

function buildRows(projects: Project[], programs: Program[], tasks: Task[], today: string): SprintRow[] {
  const programById = new Map(programs.map((p) => [p.id, p]));
  const tasksByProject = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.projectId) continue;
    const arr = tasksByProject.get(t.projectId) ?? [];
    arr.push(t);
    tasksByProject.set(t.projectId, arr);
  }

  return projects
    .filter((p) => p.status !== "cancelled")
    .map((project) => ({ project, program: project.programId ? programById.get(project.programId) ?? null : null }))
    .filter(({ project, program }) => isSprint(project, program))
    .map(({ project, program }) => {
      const c = project.course;
      const inicioVendas = c.inicioVendas || null;
      const inicioCronograma = c.estruturaCurso?.cronograma?.dataInicio ?? null;
      const prova = c.dataProvaChave ?? null;
      const fimAcesso = prova ? addDaysISO(prova, 15) : null;
      const projTasks = tasksByProject.get(project.id) ?? [];
      return {
        project,
        program,
        phase: computePhase(project, today, inicioVendas, inicioCronograma, prova, fimAcesso),
        tipo: tipoProva(project),
        coordenador: c.estruturaCurso?.coordenacao?.coordenador?.trim() ?? "",
        modalidade: c.modalidades,
        inicioVendas,
        inicioCronograma,
        prova,
        fimAcesso,
        daysToProva: prova ? daysBetween(today, prova) : null,
        tasksTotal: projTasks.length,
        tasksDone: projTasks.filter((t) => t.status === "done").length,
        tasksLate: projTasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < today).length,
        missing: missingFields(project),
      };
    })
    .sort((a, b) => (a.prova ?? "9999").localeCompare(b.prova ?? "9999"));
}

function PhaseBadge({ phase }: { phase: Phase }) {
  const color = PHASE_COLOR[phase];
  return (
    <span className="badge" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
      <span className="bdot" style={{ background: color }} /> {PHASE_LABEL[phase]}
    </span>
  );
}

function TipoBadge({ tipo }: { tipo: TipoProva }) {
  const color = TIPO_PROVA_COLOR[tipo];
  return (
    <span className="badge" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
      {TIPO_PROVA_LABEL[tipo]}
    </span>
  );
}

function monthLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ProvasView({ rows, today, showPast, onOpen }: { rows: SprintRow[]; today: string; showPast: boolean; onOpen: (id: string) => void }) {
  const events = rows.flatMap(provaEvents).sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = events.filter((e) => e.date >= today);
  const past = events.filter((e) => e.date < today).reverse();
  const semData = rows.filter((r) => provaEvents(r).length === 0);

  const groups = new Map<string, ProvaEvent[]>();
  for (const e of upcoming) {
    const k = e.date.slice(0, 7);
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }

  function eventRow(e: ProvaEvent) {
    const days = daysBetween(today, e.date);
    const [, m, d] = e.date.split("-");
    return (
      <div key={e.key} className="row" onClick={() => onOpen(e.row.project.id)} style={{ alignItems: "center", padding: "9px 4px", borderTop: "1px solid var(--border)", cursor: "pointer" }}>
        <div style={{ flex: "none", width: 52, textAlign: "center", borderRadius: 10, padding: "4px 0", background: `color-mix(in srgb, ${TIPO_PROVA_COLOR[e.row.tipo]} 12%, transparent)` }}>
          <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>{d}</div>
          <div className="muted" style={{ fontSize: 10.5 }}>{new Date(2000, Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</div>
        </div>
        <div className="stack" style={{ flex: 3 }}>
          <b style={{ fontSize: 13.5 }}>{e.row.project.name}</b>
          <span className="muted" style={{ fontSize: 11.5 }}>
            {e.label}
            {e.row.project.course.banca && ` · ${e.row.project.course.banca}`}
            {e.row.coordenador && ` · ${e.row.coordenador}`}
          </span>
        </div>
        <span className="row" style={{ gap: 6, flex: 2, justifyContent: "flex-end" }}>
          <span style={{ flex: "none" }}><TipoBadge tipo={e.row.tipo} /></span>
          <span style={{ flex: "none" }}><PhaseBadge phase={e.row.phase} /></span>
          <span style={{ flex: "none" }} className={`badge ${days < 0 ? "b-soft" : days <= 7 ? "b-high" : days <= 30 ? "b-medium" : "b-low"}`}>{countdown(days)}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      {upcoming.length === 0 && <div className="card card-pad hint">Nenhuma prova futura com esses filtros.</div>}
      {[...groups.entries()].map(([month, list]) => (
        <div className="card card-pad" key={month}>
          <div className="section-title" style={{ margin: 0 }}>{monthLabel(`${month}-01`)} <span className="count">{list.length} prova(s)</span></div>
          <div style={{ marginTop: 6 }}>{list.map(eventRow)}</div>
        </div>
      ))}
      {semData.length > 0 && (
        <div className="card card-pad">
          <div className="section-title" style={{ margin: 0 }}><span className="msi">event_busy</span> Sem data de prova <span className="count">{semData.length}</span></div>
          <div style={{ marginTop: 6 }}>
            {semData.map((r) => (
              <div key={r.project.id} className="row" onClick={() => onOpen(r.project.id)} style={{ alignItems: "center", padding: "8px 4px", borderTop: "1px solid var(--border)", cursor: "pointer" }}>
                <b style={{ fontSize: 13, flex: 3 }}>{r.project.name}</b>
                <span className="row" style={{ gap: 6, flex: 2, justifyContent: "flex-end" }}>
                  <span style={{ flex: "none" }}><TipoBadge tipo={r.tipo} /></span>
                  <span style={{ flex: "none" }}><PhaseBadge phase={r.phase} /></span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {showPast && past.length > 0 && (
        <div className="card card-pad">
          <div className="section-title" style={{ margin: 0 }}><span className="msi">history</span> Provas já realizadas <span className="count">{past.length}</span></div>
          <div style={{ marginTop: 6 }}>{past.map(eventRow)}</div>
        </div>
      )}
    </div>
  );
}

function TaskProgress({ row }: { row: SprintRow }) {
  if (row.tasksTotal === 0) return <span className="muted" style={{ fontSize: 12 }}>Sem tarefas</span>;
  const pct = Math.round((row.tasksDone / row.tasksTotal) * 100);
  return (
    <div style={{ minWidth: 110 }}>
      <div className="progress"><span style={{ width: `${pct}%` }} /></div>
      <span className="muted" style={{ fontSize: 11 }}>{row.tasksDone}/{row.tasksTotal} · {pct}%</span>
    </div>
  );
}

function countdown(days: number | null): string {
  if (days === null) return "sem data";
  if (days === 0) return "hoje";
  if (days > 0) return `em ${days} dia${days > 1 ? "s" : ""}`;
  return `há ${-days} dia${days < -1 ? "s" : ""}`;
}

export function SprintsPage() {
  const { data: projects, isLoading: loadingProjects } = useProjects();
  const { data: programs, isLoading: loadingPrograms } = usePrograms();
  const { data: tasks, isLoading: loadingTasks } = useTasks();
  const navigate = useNavigate();
  const [subView, setSubView] = useState<SubView>("provas");
  const [tipoFilter, setTipoFilter] = useState<TipoProva | "">("");
  const [query, setQuery] = useState("");
  const [coordFilter, setCoordFilter] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<Phase | "">("");
  const [showEncerrados, setShowEncerrados] = useState(false);
  const today = todayISO();

  const rows = useMemo(
    () => buildRows(projects ?? [], programs ?? [], tasks ?? [], today),
    [projects, programs, tasks, today],
  );

  if (loadingProjects || loadingPrograms || loadingTasks) return <div className="empty">Carregando…</div>;

  const coordenadores = [...new Set(rows.map((r) => r.coordenador).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const q = query.trim().toLowerCase();
  const matches = (r: SprintRow, ignoreTipo = false) => {
    if (!showEncerrados && !phaseFilter && r.phase === "encerrado") return false;
    if (phaseFilter && r.phase !== phaseFilter) return false;
    if (coordFilter && r.coordenador !== coordFilter) return false;
    if (!ignoreTipo && tipoFilter && r.tipo !== tipoFilter) return false;
    if (q && ![r.project.name, r.coordenador, r.project.course.orgaoEstado, r.project.course.banca].join(" ").toLowerCase().includes(q)) return false;
    return true;
  };
  const filtered = rows.filter((r) => matches(r));
  const tipoCounts = new Map<TipoProva, number>();
  for (const r of rows) if (matches(r, true)) tipoCounts.set(r.tipo, (tipoCounts.get(r.tipo) ?? 0) + 1);

  // KPIs sempre sobre o conjunto completo (não sobre o filtro), pra servirem
  // de visão geral estável.
  const ativos = rows.filter((r) => r.phase !== "encerrado");
  const byPhase = (p: Phase) => rows.filter((r) => r.phase === p).length;
  const provas30 = rows.filter((r) => r.daysToProva !== null && r.daysToProva >= 0 && r.daysToProva <= 30);
  const acessoEncerrando = rows.filter((r) => r.phase === "acesso" && r.fimAcesso && daysBetween(today, r.fimAcesso) <= 7);
  const allTasks = ativos.reduce((s, r) => s + r.tasksTotal, 0);
  const allDone = ativos.reduce((s, r) => s + r.tasksDone, 0);
  const allLate = ativos.reduce((s, r) => s + r.tasksLate, 0);
  const incompletos = ativos.filter((r) => r.missing.length > 0);

  const proximasProvas = rows
    .filter((r) => r.daysToProva !== null && r.daysToProva >= 0)
    .slice(0, 6);

  const coordLoad = coordenadores
    .map((name) => ({ name, n: ativos.filter((r) => r.coordenador === name).length }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n);
  const semCoord = ativos.filter((r) => !r.coordenador).length;
  const maxCoord = Math.max(1, ...coordLoad.map((c) => c.n), semCoord);

  const modLoad = (Object.keys(MODALIDADE_LABEL) as Modalidade[])
    .map((m) => ({ m, n: ativos.filter((r) => r.modalidade === m).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const maxMod = Math.max(1, ...modLoad.map((x) => x.n));

  const calItems: MiniCalendarItem[] = filtered.flatMap((r) => {
    const name = r.project.name.replace(/^sprint final\s*/i, "");
    const items: MiniCalendarItem[] = [];
    if (r.inicioVendas) items.push({ id: `${r.project.id}|v`, title: `🛒 ${name}`, date: r.inicioVendas, color: CAL_COLOR.vendas });
    if (r.inicioCronograma) items.push({ id: `${r.project.id}|i`, title: `▶ ${name}`, date: r.inicioCronograma, color: CAL_COLOR.inicio });
    for (const e of provaEvents(r)) items.push({ id: `${r.project.id}|p${e.key}`, title: `📝 ${name}${e.chave ? "" : ` (${e.label})`}`, date: e.date, color: CAL_COLOR.prova });
    if (r.fimAcesso) items.push({ id: `${r.project.id}|a`, title: `🔒 ${name}`, date: r.fimAcesso, color: CAL_COLOR.acesso });
    return items;
  });

  const kanbanPhases = PHASES.filter((p) => showEncerrados || phaseFilter === p || p !== "encerrado");
  const openProject = (id: string) => navigate(`/projetos/${id}`);

  return (
    <div>
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>
          <span className="msi">sprint</span> Sprints <span className="count">{ativos.length} ativo(s) · {rows.length} no total</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <div className="big msi">sprint</div>
          Nenhum sprint encontrado. Esta tela lista os projetos cujo nome ou programa contém "Sprint".
          <div><Link to="/projetos">Ir para Projetos</Link></div>
        </div>
      ) : (
        <>
          <div className="kpis" style={{ marginTop: 12 }}>
            <div className="kpi accent">
              <div className="lab">Sprints ativos</div>
              <div className="val">{ativos.length}</div>
              <div className="sub">{byPhase("encerrado")} encerrado(s)</div>
            </div>
            <div className="kpi">
              <div className="lab">Em vendas</div>
              <div className="val">{byPhase("vendas")}</div>
              <div className="sub">{byPhase("planejamento")} em planejamento</div>
            </div>
            <div className="kpi">
              <div className="lab">Em curso</div>
              <div className="val">{byPhase("curso")}</div>
              <div className="sub">cronograma rodando</div>
            </div>
            <div className="kpi">
              <div className="lab">Provas em 30 dias</div>
              <div className="val">{provas30.length}</div>
              <div className="sub">{acessoEncerrando.length} acesso(s) fechando em 7 dias</div>
            </div>
            <div className="kpi">
              <div className="lab">Tarefas concluídas</div>
              <div className="val">{allTasks ? Math.round((allDone / allTasks) * 100) : 0}%</div>
              <div className="sub">{allDone}/{allTasks} nos sprints ativos</div>
            </div>
            <div className="kpi">
              <div className="lab">Tarefas atrasadas</div>
              <div className="val" style={{ color: allLate ? "var(--pr-high)" : undefined }}>{allLate}</div>
              <div className="sub">nos sprints ativos</div>
            </div>
            <div className="kpi">
              <div className="lab">Cadastro incompleto</div>
              <div className="val" style={{ color: incompletos.length ? "var(--pr-medium)" : undefined }}>{incompletos.length}</div>
              <div className="sub">sprints com dados faltando</div>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginTop: 16 }}>
            <div className="card card-pad">
              <div className="section-title" style={{ margin: 0 }}><span className="msi">event</span> Próximas provas</div>
              {proximasProvas.length === 0 && <p className="muted" style={{ marginTop: 10 }}>Nenhuma prova futura cadastrada.</p>}
              {proximasProvas.map((r) => (
                <Link key={r.project.id} to={`/projetos/${r.project.id}`} className="row" style={{ justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--border)", color: "inherit" }}>
                  <span style={{ fontSize: 13 }}>{r.project.name}</span>
                  <span className="row" style={{ gap: 6, flex: "none" }}>
                    <span className="badge b-soft">{fmtDate(r.prova)}</span>
                    <span className={`badge ${r.daysToProva !== null && r.daysToProva <= 7 ? "b-high" : r.daysToProva !== null && r.daysToProva <= 30 ? "b-medium" : "b-low"}`}>{countdown(r.daysToProva)}</span>
                  </span>
                </Link>
              ))}
            </div>

            <div className="card card-pad">
              <div className="section-title" style={{ margin: 0 }}><span className="msi">person</span> Sprints por coordenador</div>
              <div className="stack" style={{ gap: 8, marginTop: 10 }}>
                {coordLoad.map((c) => (
                  <button key={c.name} className="btn ghost sm" style={{ display: "block", textAlign: "left", padding: "4px 6px" }} onClick={() => setCoordFilter(coordFilter === c.name ? "" : c.name)}>
                    <div className="row" style={{ justifyContent: "space-between", fontSize: 12.5 }}>
                      <span style={{ fontWeight: coordFilter === c.name ? 800 : 500 }}>{c.name}</span>
                      <b style={{ flex: "none" }}>{c.n}</b>
                    </div>
                    <div className="progress" style={{ height: 6 }}><span style={{ width: `${(c.n / maxCoord) * 100}%` }} /></div>
                  </button>
                ))}
                {semCoord > 0 && (
                  <div style={{ padding: "4px 6px" }}>
                    <div className="row" style={{ justifyContent: "space-between", fontSize: 12.5 }}>
                      <span className="muted">Sem coordenador</span><b style={{ flex: "none" }}>{semCoord}</b>
                    </div>
                    <div className="progress" style={{ height: 6 }}><span style={{ width: `${(semCoord / maxCoord) * 100}%`, background: "var(--st-todo)" }} /></div>
                  </div>
                )}
              </div>
            </div>

            <div className="card card-pad">
              <div className="section-title" style={{ margin: 0 }}><span className="msi">category</span> Por fase e modalidade</div>
              <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {PHASES.map((p) => (
                  <button key={p} className="btn ghost sm" style={{ flex: "none", padding: 2, border: phaseFilter === p ? "1px solid var(--accent)" : undefined }} onClick={() => setPhaseFilter(phaseFilter === p ? "" : p)}>
                    <PhaseBadge phase={p} /> <b style={{ marginLeft: 4, marginRight: 4 }}>{byPhase(p)}</b>
                  </button>
                ))}
              </div>
              <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                {modLoad.map((x) => (
                  <div key={x.m}>
                    <div className="row" style={{ justifyContent: "space-between", fontSize: 12.5 }}>
                      <span>{MODALIDADE_LABEL[x.m]}</span><b style={{ flex: "none" }}>{x.n}</b>
                    </div>
                    <div className="progress" style={{ height: 6 }}><span style={{ width: `${(x.n / maxMod) * 100}%` }} /></div>
                  </div>
                ))}
                {modLoad.length === 0 && <p className="muted" style={{ margin: 0 }}>Nenhuma modalidade cadastrada ainda.</p>}
              </div>
            </div>
          </div>

          {incompletos.length > 0 && (
            <div className="card card-pad" style={{ marginTop: 14 }}>
              <div className="section-title" style={{ margin: 0 }}>
                <span className="msi">warning</span> Pendências de cadastro <span className="count">{incompletos.length}</span>
              </div>
              <div style={{ marginTop: 8 }}>
                {incompletos.map((r) => (
                  <Link key={r.project.id} to={`/projetos/${r.project.id}`} className="row" style={{ alignItems: "center", padding: "7px 0", borderTop: "1px solid var(--border)", color: "inherit" }}>
                    <span style={{ fontSize: 13 }}>{r.project.name}</span>
                    <span className="row" style={{ gap: 5, justifyContent: "flex-end", flex: 2 }}>
                      {r.missing.map((m) => <span key={m} className="chip" style={{ flex: "none" }}>{m}</span>)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="row" style={{ marginTop: 18, gap: 6, alignItems: "center" }}>
            <span className="muted" style={{ flex: "none", fontSize: 12.5, fontWeight: 600 }}>Tipo de prova:</span>
            <button className={`btn sm ${tipoFilter === "" ? "primary" : "ghost"}`} style={{ flex: "none" }} onClick={() => setTipoFilter("")}>
              Todos <b style={{ marginLeft: 4 }}>{[...tipoCounts.values()].reduce((a, b) => a + b, 0)}</b>
            </button>
            {TIPOS_PROVA.filter((t) => t !== "sem_tipo" || tipoCounts.get(t)).map((t) => (
              <button
                key={t}
                className="btn sm ghost"
                style={{
                  flex: "none",
                  borderColor: tipoFilter === t ? TIPO_PROVA_COLOR[t] : undefined,
                  background: tipoFilter === t ? `color-mix(in srgb, ${TIPO_PROVA_COLOR[t]} 14%, transparent)` : undefined,
                  color: tipoFilter === t ? TIPO_PROVA_COLOR[t] : undefined,
                }}
                onClick={() => setTipoFilter(tipoFilter === t ? "" : t)}
              >
                <span className="bdot" style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: TIPO_PROVA_COLOR[t] }} />
                {TIPO_PROVA_LABEL[t]} <b style={{ marginLeft: 4 }}>{tipoCounts.get(t) ?? 0}</b>
              </button>
            ))}
          </div>

          <div className="row" style={{ margin: "10px 0 12px", alignItems: "center" }}>
            <input className="input" style={{ maxWidth: 280 }} placeholder="Buscar sprint, coordenador, órgão, banca…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select className="input" style={{ width: "auto", flex: "none" }} value={coordFilter} onChange={(e) => setCoordFilter(e.target.value)}>
              <option value="">Todos os coordenadores</option>
              {coordenadores.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="input" style={{ width: "auto", flex: "none" }} value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value as Phase | "")}>
              <option value="">Todas as fases</option>
              {PHASES.map((p) => <option key={p} value={p}>{PHASE_LABEL[p]}</option>)}
            </select>
            <label className="row" style={{ flex: "none", gap: 6, margin: 0, fontWeight: 400, alignItems: "center" }}>
              <input type="checkbox" checked={showEncerrados} onChange={(e) => setShowEncerrados(e.target.checked)} /> Mostrar encerrados
            </label>
            <span style={{ flex: 1 }} />
            <div className="seg" style={{ flex: "none" }}>
              {SUB_VIEWS.map((v) => (
                <button key={v.id} className={subView === v.id ? "on" : ""} onClick={() => setSubView(v.id)}>{v.label}</button>
              ))}
            </div>
          </div>

          {subView === "provas" && <ProvasView rows={filtered} today={today} showPast={showEncerrados} onOpen={openProject} />}

          {subView === "table" && (
            <div className="tbl-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Sprint</th>
                    <th>Fase</th>
                    <th>Coordenador</th>
                    <th>Tipo de prova</th>
                    <th>Modalidade</th>
                    <th>Início vendas</th>
                    <th>Início curso</th>
                    <th>Prova</th>
                    <th>Fim do acesso</th>
                    <th>Tarefas</th>
                    <th>Atrasadas</th>
                    <th>Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.project.id} onClick={() => openProject(r.project.id)} style={{ cursor: "pointer" }}>
                      <td><b>{r.project.name}</b>{r.project.course.banca && <div className="muted" style={{ fontSize: 11 }}>{r.project.course.banca}</div>}</td>
                      <td><PhaseBadge phase={r.phase} /></td>
                      <td>{r.coordenador || <span className="muted">—</span>}</td>
                      <td><TipoBadge tipo={r.tipo} /></td>
                      <td>{r.modalidade ? MODALIDADE_LABEL[r.modalidade] : <span className="muted">—</span>}</td>
                      <td>{fmtDate(r.inicioVendas)}</td>
                      <td>{fmtDate(r.inicioCronograma)}</td>
                      <td>
                        {fmtDate(r.prova)}
                        {r.daysToProva !== null && r.daysToProva >= 0 && <div className="muted" style={{ fontSize: 11 }}>{countdown(r.daysToProva)}</div>}
                      </td>
                      <td>{fmtDate(r.fimAcesso)}</td>
                      <td><TaskProgress row={r} /></td>
                      <td>{r.tasksLate ? <span className="badge b-high">{r.tasksLate}</span> : <span className="muted">0</span>}</td>
                      <td>
                        {r.missing.length === 0
                          ? <span className="badge b-done">Completo</span>
                          : <span className="badge b-medium" title={`Falta: ${r.missing.join(", ")}`}>{r.missing.length} pendente(s)</span>}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={12} className="hint">Nenhum sprint com esses filtros.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {subView === "kanban" && (
            <div className="kanban" style={{ gridTemplateColumns: `repeat(${kanbanPhases.length}, minmax(220px, 1fr))`, overflowX: "auto" }}>
              {kanbanPhases.map((phase) => {
                const items = filtered.filter((r) => r.phase === phase);
                return (
                  <div className="kcol" key={phase}>
                    <div className="kcol-head">
                      <span className="bdot" style={{ width: 8, height: 8, borderRadius: "50%", background: PHASE_COLOR[phase] }} />
                      {PHASE_LABEL[phase]}
                      <span className="n">{items.length}</span>
                    </div>
                    <div className="kcol-body">
                      {items.map((r) => (
                        <div key={r.project.id} className="kcard" style={{ borderLeftColor: PHASE_COLOR[phase] }} onClick={() => openProject(r.project.id)}>
                          <div className="kt">{r.project.name}</div>
                          <div className="kmeta">
                            <TipoBadge tipo={r.tipo} />
                            <span className="badge b-soft">📝 {fmtDate(r.prova)}</span>
                            {r.daysToProva !== null && r.daysToProva >= 0 && <span className="badge b-low">{countdown(r.daysToProva)}</span>}
                            {r.tasksLate > 0 && <span className="badge b-high">{r.tasksLate} atrasada(s)</span>}
                            {r.missing.length > 0 && <span className="badge b-medium">{r.missing.length} pendência(s)</span>}
                          </div>
                          <TaskProgress row={r} />
                          <div className="kfoot" style={{ marginTop: 6 }}>{r.coordenador || "Sem coordenador"}</div>
                        </div>
                      ))}
                      {items.length === 0 && <div className="hint" style={{ textAlign: "center" }}>—</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {subView === "calendar" && (
            <>
              <div className="row" style={{ gap: 12, marginBottom: 10, fontSize: 12 }}>
                <span style={{ flex: "none" }}><span className="bdot" style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: CAL_COLOR.vendas }} /> 🛒 Início das vendas</span>
                <span style={{ flex: "none" }}><span className="bdot" style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: CAL_COLOR.inicio }} /> ▶ Início do cronograma</span>
                <span style={{ flex: "none" }}><span className="bdot" style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: CAL_COLOR.prova }} /> 📝 Prova</span>
                <span style={{ flex: "none" }}><span className="bdot" style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: CAL_COLOR.acesso }} /> 🔒 Fim do acesso</span>
              </div>
              <MiniMonthCalendar items={calItems} onItemClick={(id) => openProject(id.split("|")[0])} />
            </>
          )}
        </>
      )}
    </div>
  );
}
