import { useState } from "react";
import { fmtDate } from "../../shared/lib/dates";
import { fmtMoney } from "../../shared/lib/money";
import { useInvoices } from "./useFinance";
import type { FinanceInvoice } from "./types";
import { InvoiceModal } from "./InvoiceModal";
import { SheetSyncPanel } from "./SheetSyncPanel";

export function FaturamentoView() {
  const { data: invoices, isLoading } = useInvoices();
  const [editing, setEditing] = useState<FinanceInvoice | null | "new">(null);

  if (isLoading) return <div className="empty">Carregando faturas…</div>;

  const list = (invoices ?? []).slice().sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  return (
    <div>
      <SheetSyncPanel view="faturamento" />
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>Faturamento <span className="count">{list.length}</span></div>
        <span style={{ flex: 1 }} />
        <button className="btn primary sm" onClick={() => setEditing("new")}>+ Nova fatura</button>
      </div>
      {list.length === 0 && <div className="empty">Nenhuma fatura ainda.</div>}
      {list.length > 0 && (
        <div className="tbl-wrap">
          <table className="data">
            <thead><tr><th>Cliente</th><th>Número</th><th>Valor</th><th>Status</th><th>Vencimento</th></tr></thead>
            <tbody>
              {list.map((inv) => (
                <tr key={inv.id} onClick={() => setEditing(inv)} style={{ cursor: "pointer" }}>
                  <td>{inv.clientName}</td>
                  <td>{inv.number || "—"}</td>
                  <td>{fmtMoney(inv.amount)}</td>
                  <td><span className={`badge ${inv.status === "paga" ? "b-done" : "b-soft"}`}>{inv.status}</span></td>
                  <td>{fmtDate(inv.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <InvoiceModal invoice={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
