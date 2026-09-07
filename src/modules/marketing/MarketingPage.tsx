import { useState } from "react";
import { Link } from "react-router-dom";
import { dueStatus, fmtDate } from "../../shared/lib/dates";
import { userName, useUsers } from "../../core/team/useUsers";
import { useTasks } from "../../core/tasks/useTasks";
import { useProjects } from "../../core/projects/useProjects";
import { STATUS_LABEL, type Task } from "../../core/tasks/types";
import { useLaunches, useRemoveLaunch, useUpdateLaunchStatus } from "../../core/launches/useLaunches";
import { LAUNCH_STATUS_LABEL, LAUNCH_STATUSES, type Launch } from "../../core/launches/types";
import { LaunchModal } from "../../core/launches/LaunchModal";
import { MarketingTaskModal } from "./MarketingTaskModal";
import { MARKETING_SECTORS } from "./sectors";

const MARKETING_DEPARTMENT_ID = "dep_mkt";

export function MarketingPage() {
  const [view, setView] = useState<"sectors" | "backlog">("sectors");

  return (
    <div>
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>
          <span className="msi">campaign</span> Marketing
        </div>
        <span style={{ flex: 1 }} />
        <div className="seg">
          <button className={view === "sectors" ? "on" : ""} onClick={() => setView("sectors")}>Por micro setor</button>
          <button className={view === "backlog" ? "on" : ""} onClick={() => setView("backlog")}>Backlog de lançamentos</button>
        </div>
      </div>

      {view === "sectors" ? <SectorsView /> : <BacklogView />}
    </div>
  );
}

function SectorsView() {
  const { data: tasks, isLoading } = useTasks();
  const { data: users } = useUsers();
  const { data: projects } = useProjects();
  const [editing, setEditing] = useState<Task | null | "new">(null);
  const [newInSector, setNewInSector] = useState<string | null>(null);
  const [origin, setOrigin] = useState<"all" | "project" | "direct">("all");

  if (isLoading) return <div className="empty">Carregando…</div>;

  const mktTasks = (tasks ?? [])
    .filter((t) => t.departmentId === MARKETING_DEPARTMENT_ID && t.status !== "done")
    .filter((t) => (origin === "all" ? true : origin === "project" ? !!t.projectId : !t.projectId));

  return (
    <div>
      <div className="row" style={{ margin: "12px 0", alignItems: "center" }}>
        <button className="btn primary sm" onClick={() => setEditing("new")}>+ Nova tarefa</button>
        <span style={{ flex: 1 }} />
        <div className="seg">
          <button className={origin === "all" ? "on" : ""} onClick={() => setOrigin("all")}>Todas</button>
          <button className={origin === "project" ? "on" : ""} onClick={() => setOrigin("project")}>De projetos</button>
          <button className={origin === "direct" ? "on" : ""} onClick={() => setOrigin("direct")}>Diretas</button>
        </div>
      </div>
      <p className="hint" style={{ marginBottom: 12 }}>
        Cada coluna mostra as duas origens juntas por padrão: tarefas vindas de um projeto (mostram o nome do
        projeto) e tarefas criadas direto aqui, designadas ao micro setor. Use os filtros acima para separar.
      </p>
      <div className="kanban">
        {MARKETING_SECTORS.map((sector) => {
          const items = mktTasks.filter((t) => t.microSectorId === sector.id);
          return (
            <div className="kcol" key={sector.id}>
              <div className="kcol-head">
                <span className="msi" style={{ fontSize: 15, marginRight: 4 }}>{sector.icon}</span>
                {sector.name}
                <span className="n">{items.length}</span>
              </div>
              <div className="kcol-body">
                {items.map((task) => {
                  const project = task.projectId ? (projects ?? []).find((p) => p.id === task.projectId) : null;
                  return (
                    <div key={task.id} className="kcard" data-prio={task.priority} onClick={() => setEditing(task)}>
                      {project && (
                        <Link
                          to={`/projetos/${project.id}`}
                          className="badge"
                          style={{ marginBottom: 6, display: "inline-flex" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="msi" style={{ fontSize: 12 }}>folder</span> {project.name}
                        </Link>
                      )}
                      <div className="kt">{task.title}</div>
                      <div className="kmeta">
                        <span className={`badge b-${dueStatus(task.dueDate, task.status)}`}>{fmtDate(task.dueDate)}</span>
                        <span className="badge">{STATUS_LABEL[task.status]}</span>
                      </div>
                      <div className="kfoot">{userName(users, task.responsibleId)}</div>
                    </div>
                  );
                })}
                <button className="btn sm ghost" style={{ width: "100%", marginTop: 6 }} onClick={() => { setNewInSector(sector.id); setEditing("new"); }}>
                  + Tarefa
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <MarketingTaskModal
          task={editing === "new" ? null : editing}
          defaultSectorId={editing === "new" ? newInSector : undefined}
          onClose={() => { setEditing(null); setNewInSector(null); }}
        />
      )}
    </div>
  );
}

function BacklogView() {
  const { data: launches, isLoading } = useLaunches();
  const { data: users } = useUsers();
  const updateStatus = useUpdateLaunchStatus();
  const removeLaunch = useRemoveLaunch();
  const [editing, setEditing] = useState<Launch | null | "new">(null);

  if (isLoading) return <div className="empty">Carregando…</div>;

  const list = launches ?? [];

  return (
    <div>
      <div className="row" style={{ margin: "12px 0" }}>
        <button className="btn primary sm" onClick={() => setEditing("new")}>+ Novo lançamento</button>
      </div>
      <div className="kanban">
        {LAUNCH_STATUSES.map((status) => {
          const items = list.filter((l) => l.status === status);
          return (
            <div className="kcol" key={status}>
              <div className="kcol-head">
                {LAUNCH_STATUS_LABEL[status]}
                <span className="n">{items.length}</span>
              </div>
              <div className="kcol-body">
                {items.map((launch) => (
                  <div key={launch.id} className="kcard" onClick={() => setEditing(launch)}>
                    <div className="kt">{launch.name}</div>
                    {launch.launchDate && (
                      <div className="kmeta">
                        <span className="badge">{fmtDate(launch.launchDate)}</span>
                      </div>
                    )}
                    <div className="kfoot">{userName(users, launch.ownerId)}</div>
                    <div className="kmove">
                      {LAUNCH_STATUSES.filter((s) => s !== status).map((s) => (
                        <button key={s} className="btn sm" onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ launch, status: s }); }}>
                          {LAUNCH_STATUS_LABEL[s]}
                        </button>
                      ))}
                      <button className="btn sm danger" onClick={(e) => { e.stopPropagation(); removeLaunch.mutate(launch.id); }}>
                        <span className="msi">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {editing && <LaunchModal launch={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
