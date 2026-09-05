import { useState } from "react";
import { STANDARD_DEPARTMENTS } from "../companies/companies";
import { useCreateProgram } from "./useProjects";
import { PROGRAM_COLORS } from "./types";

export function ProgramModal({ onClose }: { onClose: () => void }) {
  const createProgram = useCreateProgram();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PROGRAM_COLORS[0]);
  const [departmentId, setDepartmentId] = useState("");

  async function handleSave() {
    if (!name.trim()) return;
    await createProgram.mutateAsync({ name: name.trim(), description, color, departmentId: departmentId || null });
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Novo programa</h3></div>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="prog-name">Nome</label>
            <input id="prog-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label htmlFor="prog-desc">Descrição</label>
            <input id="prog-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="prog-dept">Setor</label>
              <select id="prog-dept" className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">— Nenhum —</option>
                {STANDARD_DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Cor</label>
              <div className="row" style={{ gap: 6 }}>
                {PROGRAM_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      width: 26, height: 26, borderRadius: "50%", background: c, flex: "none",
                      border: c === color ? "2px solid var(--text)" : "2px solid transparent",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={createProgram.isPending || !name.trim()}>
            {createProgram.isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
