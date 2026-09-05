import { useState } from "react";
import { STANDARD_DEPARTMENTS } from "../../core/companies/companies";
import { useCreateGoal } from "./useFinance";
import type { GoalMetric } from "./types";
import { todayISO } from "../../shared/lib/dates";

export function GoalModal({ onClose }: { onClose: () => void }) {
  const createGoal = useCreateGoal();
  const [period, setPeriod] = useState(todayISO().slice(0, 7));
  const [metricType, setMetricType] = useState<GoalMetric>("receita");
  const [targetAmount, setTargetAmount] = useState("0");
  const [departmentId, setDepartmentId] = useState("");

  async function handleSave() {
    await createGoal.mutateAsync({ period, metricType, targetAmount: Number(targetAmount) || 0, departmentId: departmentId || null });
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Nova meta</h3></div>
        <div className="modal-body">
          <div className="row">
            <div className="field">
              <label htmlFor="goal-period">Período</label>
              <input id="goal-period" type="month" className="input" value={period} onChange={(e) => setPeriod(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label htmlFor="goal-metric">Métrica</label>
              <select id="goal-metric" className="input" value={metricType} onChange={(e) => setMetricType(e.target.value as GoalMetric)}>
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
                <option value="lucro">Lucro</option>
              </select>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="goal-target">Valor alvo</label>
              <input id="goal-target" type="number" step="0.01" className="input" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="goal-dept">Setor (opcional)</label>
              <select id="goal-dept" className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">— Empresa toda —</option>
                {STANDARD_DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={createGoal.isPending}>
            {createGoal.isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
