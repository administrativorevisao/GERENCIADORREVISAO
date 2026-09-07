import { Link } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext";
import { dueStatus, fmtDate, todayISO } from "../../shared/lib/dates";
import { useTasks } from "../tasks/useTasks";
import { STATUS_LABEL } from "../tasks/types";
import { useProjects } from "../projects/useProjects";
import { PROJECT_STATUS_LABEL } from "../projects/types";

export function DashboardPage() {
  const { profile } = useAuth();
  const { data: tasks, isLoading: loadingTasks } = useTasks();
  const { data: projects, isLoading: loadingProjects } = useProjects();

  const myTasks = (tasks ?? [])
    .filter((t) => t.responsibleId === profile?.id && t.status !== "done")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const tasksToday = myTasks.filter((t) => t.dueDate === todayISO());

  const myProjects = (projects ?? [])
    .filter((p) => p.ownerId === profile?.id && p.status === "active")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const loading = loadingTasks || loadingProjects;

  return (
    <div>
      <div className="section-title">Olá, {profile?.shortName ?? "colaborador"} 👋</div>
      <div className="kpis">
        <div className="kpi">
          <div className="lab">Minhas tarefas hoje</div>
          <div className="val">{loading ? "—" : tasksToday.length}</div>
        </div>
        <div className="kpi">
          <div className="lab">Minhas tarefas pendentes</div>
          <div className="val">{loading ? "—" : myTasks.length}</div>
        </div>
        <div className="kpi">
          <div className="lab">Meus projetos ativos</div>
          <div className="val">{loading ? "—" : myProjects.length}</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14, marginTop: 20 }}>
        <div className="card card-pad">
          <div className="section-title" style={{ margin: 0 }}>
            <span className="msi">task_alt</span> Minhas tarefas <span className="count">{myTasks.length}</span>
          </div>
          {loading ? (
            <p className="muted" style={{ marginTop: 10 }}>Carregando…</p>
          ) : myTasks.length === 0 ? (
            <p className="muted" style={{ marginTop: 10 }}>Nenhuma tarefa pendente atribuída a você.</p>
          ) : (
            <div style={{ marginTop: 10 }}>
              {myTasks.slice(0, 8).map((t) => (
                <div key={t.id} className="row" style={{ justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--border, #eee)" }}>
                  <span>{t.title}</span>
                  <span className="row" style={{ gap: 6 }}>
                    <span className={`badge b-${dueStatus(t.dueDate, t.status)}`}>{fmtDate(t.dueDate)}</span>
                    <span className="badge">{STATUS_LABEL[t.status]}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link to="/tarefas" className="btn sm ghost" style={{ marginTop: 12 }}>Ver todas as tarefas</Link>
        </div>

        <div className="card card-pad">
          <div className="section-title" style={{ margin: 0 }}>
            <span className="msi">folder</span> Meus projetos <span className="count">{myProjects.length}</span>
          </div>
          {loading ? (
            <p className="muted" style={{ marginTop: 10 }}>Carregando…</p>
          ) : myProjects.length === 0 ? (
            <p className="muted" style={{ marginTop: 10 }}>Nenhum projeto ativo sob sua responsabilidade.</p>
          ) : (
            <div style={{ marginTop: 10 }}>
              {myProjects.slice(0, 8).map((p) => (
                <Link key={p.id} to={`/projetos/${p.id}`} className="row" style={{ justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--border, #eee)", color: "inherit" }}>
                  <span>{p.name}</span>
                  <span className="row" style={{ gap: 6 }}>
                    <span className={`badge b-${dueStatus(p.dueDate, p.status === "done" ? "done" : "todo")}`}>{fmtDate(p.dueDate)}</span>
                    <span className="badge">{PROJECT_STATUS_LABEL[p.status]}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
          <Link to="/projetos" className="btn sm ghost" style={{ marginTop: 12 }}>Ver todos os projetos</Link>
        </div>
      </div>
    </div>
  );
}
