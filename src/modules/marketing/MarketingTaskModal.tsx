import { useState } from "react";
import { useUsers } from "../../core/team/useUsers";
import { useProjects } from "../../core/projects/useProjects";
import { useCreateTask, useUpdateTask } from "../../core/tasks/useTasks";
import { PRIORITY_LABEL, type Task, type TaskPriority } from "../../core/tasks/types";
import { todayISO } from "../../shared/lib/dates";
import { MARKETING_SECTORS } from "./sectors";

const MARKETING_DEPARTMENT_ID = "dep_mkt";

export function MarketingTaskModal({ task, defaultSectorId, onClose }: { task: Task | null; defaultSectorId?: string | null; onClose: () => void }) {
  const { data: users } = useUsers();
  const { data: projects } = useProjects();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [microSectorId, setMicroSectorId] = useState(task?.microSectorId ?? defaultSectorId ?? "");
  const [projectId, setProjectId] = useState(task?.projectId ?? "");
  const [responsibleId, setResponsibleId] = useState(task?.responsibleId ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? todayISO());

  const saving = createTask.isPending || updateTask.isPending;

  async function handleSave() {
    if (!title.trim()) return;
    const patch = {
      title: title.trim(),
      description,
      departmentId: MARKETING_DEPARTMENT_ID,
      microSectorId: microSectorId || null,
      projectId: projectId || null,
      responsibleId: responsibleId || null,
      priority,
      dueDate,
    };
    if (task) await updateTask.mutateAsync({ ...task, ...patch });
    else await createTask.mutateAsync(patch);
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{task ? "Editar tarefa de Marketing" : "Nova tarefa de Marketing"}</h3></div>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="mkt-task-title">Título</label>
            <input id="mkt-task-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label htmlFor="mkt-task-desc">Descrição</label>
            <textarea id="mkt-task-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="mkt-task-sector">Micro setor</label>
              <select id="mkt-task-sector" className="input" value={microSectorId} onChange={(e) => setMicroSectorId(e.target.value)}>
                <option value="">— Nenhum —</option>
                {MARKETING_SECTORS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="mkt-task-resp">Responsável</label>
              <select id="mkt-task-resp" className="input" value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)}>
                <option value="">— Ninguém —</option>
                {(users ?? []).map((u) => <option key={u.id} value={u.id}>{u.shortName || u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="mkt-task-project">Projeto (opcional)</label>
            <select id="mkt-task-project" className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">— Tarefa direta, sem projeto —</option>
              {(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="mkt-task-priority">Prioridade</label>
              <select id="mkt-task-priority" className="input" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                {Object.entries(PRIORITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="mkt-task-due">Prazo</label>
              <input id="mkt-task-due" type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
