import { useState } from "react";
import { useUsers } from "../team/useUsers";
import { useSaveProcedure } from "./useTeamStandards";
import type { Procedure, ProcedureStep } from "./types";

function newStep(): ProcedureStep {
  return { id: `step_${Math.random().toString(36).slice(2, 8)}`, title: "", description: "", responsibleId: null, daysToComplete: null };
}

export function ProcedureModal({ procedure, onClose }: { procedure: Procedure | null; onClose: () => void }) {
  const { data: users } = useUsers();
  const saveProcedure = useSaveProcedure();
  const [name, setName] = useState(procedure?.name ?? "");
  const [description, setDescription] = useState(procedure?.description ?? "");
  const [steps, setSteps] = useState<ProcedureStep[]>(procedure?.steps ?? [newStep()]);

  function updateStep(id: string, patch: Partial<ProcedureStep>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function addStep() {
    setSteps((prev) => [...prev, newStep()]);
  }
  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }
  function moveStep(index: number, dir: -1 | 1) {
    setSteps((prev) => {
      const next = prev.slice();
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    if (!name.trim() || steps.length === 0) return;
    await saveProcedure.mutateAsync({
      procedure: { name: name.trim(), description, steps },
      existing: procedure ?? undefined,
    });
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{procedure ? "Editar procedimento padrão" : "Novo procedimento padrão"}</h3></div>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="proc-name">Nome do procedimento</label>
            <input id="proc-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ex: Abertura de novo curso" />
          </div>
          <div className="field">
            <label htmlFor="proc-desc">Descrição</label>
            <textarea id="proc-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Quando este procedimento deve ser usado" />
          </div>

          <div className="section-title" style={{ fontSize: 13, marginTop: 16 }}>Etapas, em ordem</div>
          <p className="hint" style={{ marginBottom: 10 }}>
            Ao concluir a tarefa de uma etapa, a tarefa da etapa seguinte é criada e atribuída automaticamente ao
            responsável definido abaixo.
          </p>

          {steps.map((step, i) => (
            <div key={step.id} className="card card-pad" style={{ marginBottom: 10 }}>
              <div className="row" style={{ alignItems: "center", gap: 8, marginBottom: 8 }}>
                <b style={{ fontSize: 13 }}>Etapa {i + 1}</b>
                <span style={{ flex: 1 }} />
                <button className="btn sm ghost" onClick={() => moveStep(i, -1)} disabled={i === 0} title="Mover para cima">
                  <span className="msi">arrow_upward</span>
                </button>
                <button className="btn sm ghost" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} title="Mover para baixo">
                  <span className="msi">arrow_downward</span>
                </button>
                <button className="btn sm danger" onClick={() => removeStep(step.id)} disabled={steps.length === 1} title="Remover etapa">
                  <span className="msi">delete</span>
                </button>
              </div>
              <div className="field">
                <label>Título da etapa</label>
                <input className="input" value={step.title} onChange={(e) => updateStep(step.id, { title: e.target.value })} placeholder="Ex: Aprovar ementa" />
              </div>
              <div className="field">
                <label>Descrição (opcional)</label>
                <input className="input" value={step.description} onChange={(e) => updateStep(step.id, { description: e.target.value })} />
              </div>
              <div className="row">
                <div className="field">
                  <label>Responsável</label>
                  <select className="input" value={step.responsibleId ?? ""} onChange={(e) => updateStep(step.id, { responsibleId: e.target.value || null })}>
                    <option value="">— Ninguém —</option>
                    {(users ?? []).map((u) => <option key={u.id} value={u.id}>{u.shortName || u.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Prazo (dias após iniciar a etapa)</label>
                  <input
                    type="number" min={0} className="input" value={step.daysToComplete ?? ""}
                    onChange={(e) => updateStep(step.id, { daysToComplete: e.target.value ? Number(e.target.value) : null })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          ))}
          <button className="btn sm" onClick={addStep}>+ Adicionar etapa</button>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={saveProcedure.isPending || !name.trim() || steps.length === 0}>
            {saveProcedure.isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
