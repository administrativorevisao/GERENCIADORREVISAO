import { useState } from "react";
import { fmtDate } from "../../shared/lib/dates";
import { fmtMoney } from "../../shared/lib/money";
import { useTxns } from "./useFinance";
import { FIN_TXN_STATUS, type FinanceTxn } from "./types";
import { TxnModal } from "./TxnModal";
import { SheetSyncPanel } from "./SheetSyncPanel";

export function FluxoCaixaView() {
  const { data: txns, isLoading, error } = useTxns();
  const [editing, setEditing] = useState<FinanceTxn | null | "new">(null);

  if (isLoading) return <div className="empty">Carregando lançamentos…</div>;
  if (error) return <div className="empty">Erro: {(error as Error).message}</div>;

  const list = (txns ?? []).slice().sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  return (
    <div>
      <SheetSyncPanel view="fluxoCaixa" />
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>Fluxo de Caixa <span className="count">{list.length}</span></div>
        <span style={{ flex: 1 }} />
        <button className="btn primary sm" onClick={() => setEditing("new")}>+ Novo lançamento</button>
      </div>
      {list.length === 0 && <div className="empty">Nenhum lançamento ainda.</div>}
      {list.length > 0 && (
        <div className="tbl-wrap">
          <table className="data">
            <thead>
              <tr><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Status</th><th>Vencimento</th><th>Competência</th></tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id} onClick={() => setEditing(t)} style={{ cursor: "pointer" }}>
                  <td>{t.description}</td>
                  <td><span className={`badge ${t.type === "receita" ? "b-done" : "b-high"}`}>{t.type}</span></td>
                  <td>{fmtMoney(t.amount)}</td>
                  <td><span className="badge b-soft">{FIN_TXN_STATUS[t.status]}</span></td>
                  <td>{fmtDate(t.dueDate)}</td>
                  <td>{t.competenceMonth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <TxnModal txn={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
