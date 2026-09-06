import { useState } from "react";
import { useUsers } from "../../core/team/useUsers";
import { fmtMoney } from "../../shared/lib/money";
import { contractorLabel } from "./api";
import { useContractorInvoices } from "./useFinance";
import type { FinanceContractorInvoice } from "./types";
import { ContractorInvoiceModal } from "./ContractorInvoiceModal";
import { SheetSyncPanel } from "./SheetSyncPanel";

export function NFsContratadosView() {
  const { data: invoices, isLoading } = useContractorInvoices();
  const { data: users } = useUsers();
  const [editing, setEditing] = useState<FinanceContractorInvoice | null | "new">(null);

  if (isLoading) return <div className="empty">Carregando NFs…</div>;

  const list = (invoices ?? []).slice().sort((a, b) => b.competenceMonth.localeCompare(a.competenceMonth));

  return (
    <div>
      <SheetSyncPanel view="nfsContratados" />
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>NFs de Contratados <span className="count">{list.length}</span></div>
        <span style={{ flex: 1 }} />
        <button className="btn primary sm" onClick={() => setEditing("new")}>+ Nova NF</button>
      </div>
      {list.length === 0 && <div className="empty">Nenhuma NF registrada ainda.</div>}
      {list.length > 0 && (
        <div className="tbl-wrap">
          <table className="data">
            <thead><tr><th>Contratado</th><th>NF</th><th>Valor</th><th>Competência</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((inv) => (
                <tr key={inv.id} onClick={() => setEditing(inv)} style={{ cursor: "pointer" }}>
                  <td>{contractorLabel(inv, users?.find((u) => u.id === inv.userId)?.shortName ?? null)}</td>
                  <td>{inv.nfNumber || "—"}</td>
                  <td>{fmtMoney(inv.amount)}</td>
                  <td>{inv.competenceMonth}</td>
                  <td><span className={`badge ${inv.status === "paga" ? "b-done" : "b-soft"}`}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <ContractorInvoiceModal invoice={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
