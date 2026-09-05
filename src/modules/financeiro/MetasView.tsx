import { useState } from "react";
import { STANDARD_DEPARTMENTS } from "../../core/companies/companies";
import { fmtMoney } from "../../shared/lib/money";
import { actualFor } from "./api";
import { useGoals, useTxns } from "./useFinance";
import { GoalModal } from "./GoalModal";

export function MetasView() {
  const { data: goals, isLoading } = useGoals();
  const { data: txns } = useTxns();
  const [creating, setCreating] = useState(false);

  if (isLoading) return <div className="empty">Carregando metas…</div>;

  const list = (goals ?? []).slice().sort((a, b) => b.period.localeCompare(a.period));
  const allTxns = txns ?? [];

  return (
    <div>
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>Metas Financeiras <span className="count">{list.length}</span></div>
        <span style={{ flex: 1 }} />
        <button className="btn primary sm" onClick={() => setCreating(true)}>+ Nova meta</button>
      </div>
      {list.length === 0 && <div className="empty">Nenhuma meta cadastrada ainda.</div>}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {list.map((goal) => {
          const actual = actualFor(allTxns, goal.period, goal.metricType, goal.departmentId);
          const percent = goal.targetAmount > 0 ? Math.round((actual / goal.targetAmount) * 100) : 0;
          const deptName = STANDARD_DEPARTMENTS.find((d) => d.id === goal.departmentId)?.name ?? "Empresa toda";
          return (
            <div className="card card-pad" key={goal.id}>
              <div className="muted" style={{ fontSize: 11.5 }}>{goal.period} · {deptName}</div>
              <b style={{ textTransform: "capitalize" }}>{goal.metricType}</b>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6 }}>{percent}%</div>
              <div className="progress" style={{ marginTop: 6 }}>
                <span style={{ width: `${Math.min(100, percent)}%` }} />
              </div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>{fmtMoney(actual)} de {fmtMoney(goal.targetAmount)}</div>
            </div>
          );
        })}
      </div>
      {creating && <GoalModal onClose={() => setCreating(false)} />}
    </div>
  );
}
