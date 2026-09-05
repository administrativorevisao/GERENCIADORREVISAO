import { useState } from "react";
import { dueStatus, fmtDate } from "../../shared/lib/dates";
import { fmtMoney } from "../../shared/lib/money";
import { useTxns } from "./useFinance";
import type { FinanceTxn } from "./types";
import { TxnModal } from "./TxnModal";

export function ContasView() {
  const { data: txns, isLoading } = useTxns();
  const [editing, setEditing] = useState<FinanceTxn | null>(null);

  if (isLoading) return <div className="empty">Carregando…</div>;

  const pending = (txns ?? [])
    .filter((t) => t.status !== "pago" && t.status !== "cancelado")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const payables = pending.filter((t) => t.type === "despesa");
  const receivables = pending.filter((t) => t.type === "receita");

  const table = (title: string, rows: FinanceTxn[]) => (
    <div className="card card-pad" style={{ marginBottom: 14 }}>
      <div className="section-title">{title} <span className="count">{rows.length}</span></div>
      {rows.length === 0 && <div className="hint">Nada pendente.</div>}
      {rows.map((t) => (
        <div className="list-item" key={t.id} onClick={() => setEditing(t)}>
          <div className="stack" style={{ flex: 1 }}>
            <b style={{ fontSize: 13.5 }}>{t.description}</b>
            <span className="muted" style={{ fontSize: 11.5 }}>{t.counterparty}</span>
          </div>
          <span className={`badge b-${dueStatus(t.dueDate, "todo")}`}>{fmtDate(t.dueDate)}</span>
          <b>{fmtMoney(t.amount)}</b>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="section-title" style={{ margin: "0 0 14px" }}>Contas a Pagar/Receber</div>
      {table("A pagar", payables)}
      {table("A receber", receivables)}
      {editing && <TxnModal txn={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
