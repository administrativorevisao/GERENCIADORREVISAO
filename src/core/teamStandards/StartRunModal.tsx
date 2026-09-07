import { useState } from "react";
import { useStartProcedureRun } from "./useTeamStandards";
import type { Procedure } from "./types";

export function StartRunModal({ procedure, onClose }: { procedure: Procedure; onClose: () => void }) {
  const [label, setLabel] = useState("");
  const startRun = useStartProcedureRun();

  async function handleStart() {
    if (!label.trim()) return;
    await startRun.mutateAsync({ procedure, label: label.trim() });
    onClose();
  }

  const firstStep = procedure.steps[0];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Iniciar "{procedure.name}"</h3></div>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="run-label">A que se refere esta execução?</label>
            <input id="run-label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus placeholder="Ex: OAB 1ª Fase - Nov/2026" />
          </div>
          {firstStep && (
            <p className="hint">
              A primeira tarefa ("{firstStep.title}") será criada agora, atribuída ao responsável definido na etapa.
              As próximas {procedure.steps.length - 1} etapa(s) serão criadas automaticamente, uma a uma, conforme
              cada tarefa for concluída.
            </p>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleStart} disabled={startRun.isPending || !label.trim()}>
            {startRun.isPending ? "Iniciando…" : "Iniciar"}
          </button>
        </div>
      </div>
    </div>
  );
}
