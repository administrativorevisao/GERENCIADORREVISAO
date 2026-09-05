import { useState } from "react";
import { useUsers, userName } from "../team/useUsers";
import { useTasks, useUpdateTaskStatus } from "./useTasks";
import { STATUS_LABEL, type Task, type TaskStatus } from "./types";
import { TaskModal } from "./TaskModal";
import { dueStatus, fmtDate } from "../../shared/lib/dates";

const STATUSES: TaskStatus[] = ["todo", "doing", "done"];

export function TasksPage() {
  const { data: tasks, isLoading, error } = useTasks();
  const { data: users } = useUsers();
  const updateStatus = useUpdateTaskStatus();
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [editing, setEditing] = useState<Task | null | "new">(null);

  if (isLoading) return <div className="empty">Carregando tarefas…</div>;
  if (error) return <div className="empty">Erro ao carregar tarefas: {(error as Error).message}</div>;

  const list = tasks ?? [];

  return (
    <div>
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>
          <span className="msi">task_alt</span> Tarefas <span className="count">{list.length}</span>
        </div>
        <span style={{ flex: 1 }} />
        <div className="seg">
          <button className={view === "kanban" ? "on" : ""} onClick={() => setView("kanban")}>Kanban</button>
          <button className={view === "table" ? "on" : ""} onClick={() => setView("table")}>Tabela</button>
        </div>
        <button className="btn primary sm" onClick={() => setEditing("new")}>+ Nova tarefa</button>
      </div>

      {list.length === 0 && (
        <div className="empty">
          <div className="big msi">task_alt</div>
          Nenhuma tarefa ainda.
        </div>
      )}

      {list.length > 0 && view === "kanban" && (
        <div className="kanban">
          {STATUSES.map((status) => {
            const items = list.filter((t) => t.status === status);
            return (
              <div className="kcol" key={status}>
                <div className="kcol-head">
                  {STATUS_LABEL[status]}
                  <span className="n">{items.length}</span>
                </div>
                <div className="kcol-body">
                  {items.map((task) => (
                    <div
                      key={task.id}
                      className="kcard"
                      data-prio={task.priority}
                      onClick={() => setEditing(task)}
                    >
                      <div className="kt">{task.title}</div>
                      <div className="kmeta">
                        <span className={`badge b-${dueStatus(task.dueDate, task.status)}`}>{fmtDate(task.dueDate)}</span>
                      </div>
                      <div className="kfoot">{userName(users, task.responsibleId)}</div>
                      <div className="kmove">
                        {STATUSES.filter((s) => s !== status).map((s) => (
                          <button
                            key={s}
                            className="btn sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus.mutate({ task, status: s });
                            }}
                          >
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
      )}

      {list.length > 0 && view === "table" && (
        <div className="tbl-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Tarefa</th>
                <th>Responsável</th>
                <th>Status</th>
                <th>Prazo</th>
              </tr>
            </thead>
            <tbody>
              {list.map((task) => (
                <tr key={task.id} onClick={() => setEditing(task)} style={{ cursor: "pointer" }}>
                  <td>{task.title}</td>
                  <td>{userName(users, task.responsibleId)}</td>
                  <td>
                    <select
                      className="input"
                      style={{ padding: "4px 8px", fontSize: 12.5 }}
                      value={task.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateStatus.mutate({ task, status: e.target.value as TaskStatus })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={`badge b-${dueStatus(task.dueDate, task.status)}`}>{fmtDate(task.dueDate)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <TaskModal task={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
