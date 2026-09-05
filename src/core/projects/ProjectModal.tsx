import { useState } from "react";
import { STANDARD_DEPARTMENTS } from "../companies/companies";
import { useCreateProject } from "./useProjects";
import type { Program } from "./types";
import { todayISO } from "../../shared/lib/dates";

export function ProjectModal({ program, onClose }: { program?: Program; onClose: () => void }) {
  const createProject = useCreateProject();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState(program?.departmentId ?? "");
  const [dueDate, setDueDate] = useState(todayISO());

  async function handleSave() {
    if (!name.trim()) return;
    await createProject.mutateAsync({
      name: name.trim(),
      description,
      programId: program?.id ?? null,
      departmentId: departmentId || null,
      dueDate,
    });
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{program ? `Novo projeto em ${program.name}` : "Novo projeto"}</h3></div>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="proj-name">Nome</label>
            <input id="proj-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label htmlFor="proj-desc">Descrição</label>
            <textarea id="proj-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="proj-dept">Setor</label>
              <select id="proj-dept" className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">— Nenhum —</option>
                {STANDARD_DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="proj-due">Prazo</label>
              <input id="proj-due" type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={createProject.isPending || !name.trim()}>
            {createProject.isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
