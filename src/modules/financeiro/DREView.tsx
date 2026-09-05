import { useState } from "react";
import { DRE_GROUPS } from "./types";
import { calculateDre } from "./api";
import { useTxns } from "./useFinance";
import { fmtMoney } from "../../shared/lib/money";
import { todayISO } from "../../shared/lib/dates";

export function DREView() {
  const { data: txns, isLoading } = useTxns();
  const currentMonth = todayISO().slice(0, 7);
  const [periodFrom, setPeriodFrom] = useState(currentMonth);
  const [periodTo, setPeriodTo] = useState(currentMonth);

  if (isLoading) return <div className="empty">Carregando DRE…</div>;

  const dre = calculateDre(txns ?? [], periodFrom, periodTo);

  return (
    <div>
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>DRE</div>
        <span style={{ flex: 1 }} />
        <div className="field" style={{ margin: 0 }}>
          <input type="month" className="input" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
        </div>
        <span className="muted">até</span>
        <div className="field" style={{ margin: 0 }}>
          <input type="month" className="input" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
        </div>
      </div>

      <div className="card">
        {(Object.keys(DRE_GROUPS) as (keyof typeof DRE_GROUPS)[]).map((group) => {
          const g = dre.groups[group];
          return (
            <div key={group} style={{ borderBottom: "1px solid var(--border)", padding: "12px 16px" }}>
              <div className="row" style={{ justifyContent: "space-between", fontWeight: 700 }}>
                <span>{DRE_GROUPS[group]}</span>
                <span>{fmtMoney(g.total)}</span>
              </div>
              {Object.entries(g.byCategory).map(([cat, value]) => (
                <div key={cat} className="row muted" style={{ justifyContent: "space-between", fontSize: 12.5, paddingLeft: 12 }}>
                  <span>{cat}</span>
                  <span>{fmtMoney(value)}</span>
                </div>
              ))}
            </div>
          );
        })}
        <div className="row" style={{ justifyContent: "space-between", padding: "14px 16px", fontWeight: 800, fontSize: 16 }}>
          <span>Resultado</span>
          <span style={{ color: dre.resultado >= 0 ? "var(--st-done)" : "var(--pr-high)" }}>{fmtMoney(dre.resultado)}</span>
        </div>
      </div>
    </div>
  );
}
