import { useState } from "react";
import { userName, useUsers } from "../../core/team/useUsers";
import { fmtMoney } from "../../shared/lib/money";
import { payrollNet } from "./api";
import { usePayroll } from "./useFinance";
import type { FinancePayroll } from "./types";
import { PayrollModal } from "./PayrollModal";
import { SheetSyncPanel } from "./SheetSyncPanel";

export function FolhaView() {
  const { data: payroll, isLoading } = usePayroll();
  const { data: users } = useUsers();
  const [editing, setEditing] = useState<FinancePayroll | null | "new">(null);

  if (isLoading) return <div className="empty">Carregando folha…</div>;

  const list = (payroll ?? []).slice().sort((a, b) => b.competenceMonth.localeCompare(a.competenceMonth));

  return (
    <div>
      <SheetSyncPanel view="folha" />
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>Folha de Pagamento <span className="count">{list.length}</span></div>
        <span style={{ flex: 1 }} />
        <button className="btn primary sm" onClick={() => setEditing("new")}>+ Nova folha</button>
      </div>
      {list.length === 0 && <div className="empty">Nenhum registro de folha ainda.</div>}
      {list.length > 0 && (
        <div className="tbl-wrap">
          <table className="data">
            <thead><tr><th>Colaborador</th><th>Competência</th><th>Líquido</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} onClick={() => setEditing(p)} style={{ cursor: "pointer" }}>
                  <td>{userName(users, p.userId)}</td>
                  <td>{p.competenceMonth}</td>
                  <td>{fmtMoney(payrollNet(p))}</td>
                  <td><span className={`badge ${p.status === "pago" ? "b-done" : "b-soft"}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <PayrollModal payroll={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
