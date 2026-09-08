import { useState } from "react";
import { useUpdateProgram } from "./useProjects";
import { newId } from "../../shared/lib/jsonStore";
import type { Program } from "./types";

export function SubProgramModal({ program, onClose }: { program: Program; onClose: () => void }) {
  const updateProgram = useUpdateProgram();
  const [name, setName] = useState("");

  async function handleSave() {
    if (!name.trim()) return;
    const subPrograms = [...program.subPrograms, { id: newId("sub"), name: name.trim() }];
    await updateProgram.mutateAsync({ ...program, subPrograms });
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Novo concurso em "{program.name}"</h3></div>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="subprog-name">Nome do concurso</label>
            <input
              id="subprog-name" className="input" placeholder="Ex: PGM Rio de Janeiro"
              value={name} onChange={(e) => setName(e.target.value)} autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>
          <p className="hint">
            Depois de criado, arraste os projetos daquele concurso para dentro dele.
          </p>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={updateProgram.isPending || !name.trim()}>
            {updateProgram.isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
