import { useState } from "react";
import { useUsers } from "../team/useUsers";
import { useCreateTask, useUpdateTask } from "./useTasks";
import type { Task, TaskPriority } from "./types";
import { PRIORITY_LABEL } from "./types";
import { todayISO } from "../../shared/lib/dates";

export function TaskModal({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { data: users } = useUsers();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [responsibleId, setResponsibleId] = useState(task?.responsibleId ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? todayISO());

  const saving = createTask.isPending || updateTask.isPending;

  async function handleSave() {
    if (!title.trim()) return;
    const patch = {
      title: title.trim(),
      description,
      priority,
      responsibleId: responsibleId || null,
      dueDate,
    };
    if (task) {
      await updateTask.mutateAsync({ ...task, ...patch });
    } else {
      await createTask.mutateAsync(patch);
    }
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{task ? "Editar tarefa" : "Nova tarefa"}</h3>
        </div>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="task-title">Título</label>
            <input id="task-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label htmlFor="task-desc">Descrição</label>
            <textarea id="task-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="task-resp">Responsável</label>
              <select id="task-resp" className="input" value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)}>
                <option value="">— Ninguém —</option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>{u.shortName}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="task-priority">Prioridade</label>
              <select id="task-priority" className="input" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="task-due">Prazo</label>
              <input id="task-due" type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
