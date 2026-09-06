import { useState } from "react";
import { fmtMoney } from "../../shared/lib/money";
import { accountBalance } from "./api";
import { useAccounts, useTxns } from "./useFinance";
import type { FinanceAccount } from "./types";
import { AccountModal } from "./AccountModal";
import { SheetSyncPanel } from "./SheetSyncPanel";

export function ContasBancariasView() {
  const { data: accounts, isLoading } = useAccounts();
  const { data: txns } = useTxns();
  const [editing, setEditing] = useState<FinanceAccount | null | "new">(null);

  if (isLoading) return <div className="empty">Carregando contas…</div>;

  const list = accounts ?? [];
  const allTxns = txns ?? [];

  return (
    <div>
      <SheetSyncPanel view="contasBancarias" />
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>Contas Bancárias <span className="count">{list.length}</span></div>
        <span style={{ flex: 1 }} />
        <button className="btn primary sm" onClick={() => setEditing("new")}>+ Nova conta</button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {list.map((a) => (
          <div className="card card-pad" key={a.id} style={{ cursor: "pointer" }} onClick={() => setEditing(a)}>
            <b>{a.name}</b>
            <div className="muted" style={{ fontSize: 12 }}>{a.bank} · {a.type}</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{fmtMoney(accountBalance(a, allTxns))}</div>
            {!a.active && <span className="badge b-soft" style={{ marginTop: 6 }}>Inativa</span>}
          </div>
        ))}
        {list.length === 0 && <div className="empty">Nenhuma conta cadastrada.</div>}
      </div>
      {editing && <AccountModal account={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
