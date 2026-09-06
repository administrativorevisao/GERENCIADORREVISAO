import { useState } from "react";
import { STANDARD_DEPARTMENTS } from "../companies/companies";
import { useUsers } from "../team/useUsers";
import { useCreateTask } from "./useTasks";
import type { TaskPriority } from "./types";
import { PRIORITY_LABEL } from "./types";
import { todayISO } from "../../shared/lib/dates";

export function ProcessModal({ defaultDeptId, onClose }: { defaultDeptId?: string; onClose: () => void }) {
  const { data: users } = useUsers();
  const createTask = useCreateTask();

  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState(defaultDeptId ?? "");
  const [responsibleId, setResponsibleId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState(todayISO());

  async function handleSave() {
    if (!title.trim()) return;
    await createTask.mutateAsync({
      title: title.trim(), type: "process", departmentId: departmentId || null,
      responsibleId: responsibleId || null, priority, dueDate,
    });
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Nova demanda</h3></div>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="proc-title">Título</label>
            <input id="proc-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="proc-dept">Setor</label>
              <select id="proc-dept" className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">— Nenhum —</option>
                {STANDARD_DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="proc-resp">Responsável</label>
              <select id="proc-resp" className="input" value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)}>
                <option value="">— Ninguém —</option>
                {users?.map((u) => <option key={u.id} value={u.id}>{u.shortName}</option>)}
              </select>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="proc-priority">Prioridade</label>
              <select id="proc-priority" className="input" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                {Object.entries(PRIORITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="proc-due">Prazo</label>
              <input id="proc-due" type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={createTask.isPending || !title.trim()}>
            {createTask.isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
