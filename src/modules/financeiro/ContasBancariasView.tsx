import { useState } from "react";
import { fmtMoney } from "../../shared/lib/money";
import { todayISO } from "../../shared/lib/dates";
import { accountBalance } from "./api";
import { useAccountBalances, useAccounts, useTxns } from "./useFinance";
import type { FinanceAccount } from "./types";
import { AccountModal } from "./AccountModal";
import { SheetSyncPanel } from "./SheetSyncPanel";
import { DateFilterBar } from "./DateFilterBar";

// Mês (YYYY-MM) → último dia daquele mês, no formato YYYY-MM-DD.
function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${ym}-${String(last).padStart(2, "0")}`;
}

export function ContasBancariasView() {
  const { data: accounts, isLoading } = useAccounts();
  const { data: txns } = useTxns();
  const { data: balances } = useAccountBalances();
  const [editing, setEditing] = useState<FinanceAccount | null | "new">(null);
  const [dayFilter, setDayFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  if (isLoading) return <div className="empty">Carregando contas…</div>;

  const list = accounts ?? [];
  const allTxns = txns ?? [];
  // Saldo "até" essa data — dia exato tem prioridade; mês vira o último dia
  // daquele mês; sem nenhum filtro, é o saldo de hoje.
  const asOfDate = dayFilter || (monthFilter ? lastDayOfMonth(monthFilter) : todayISO());

  return (
    <div>
      <SheetSyncPanel view="contasBancarias" />
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>Contas Bancárias <span className="count">{list.length}</span></div>
        <span style={{ flex: 1 }} />
        <DateFilterBar day={dayFilter} month={monthFilter} onDayChange={setDayFilter} onMonthChange={setMonthFilter} dayLabel="Saldo até o dia" monthLabel="Saldo até o fim do mês" />
        <button className="btn primary sm" onClick={() => setEditing("new")}>+ Nova conta</button>
      </div>
      {(dayFilter || monthFilter) && <p className="hint" style={{ marginTop: -6, marginBottom: 12 }}>Mostrando saldo em {asOfDate.split("-").reverse().join("/")}.</p>}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {list.map((a) => (
          <div className="card card-pad" key={a.id} style={{ cursor: "pointer" }} onClick={() => setEditing(a)}>
            <b>{a.name}</b>
            <div className="muted" style={{ fontSize: 12 }}>{a.bank} · {a.type}</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{fmtMoney(accountBalance(a, allTxns, asOfDate, balances ?? []))}</div>
            {!a.active && <span className="badge b-soft" style={{ marginTop: 6 }}>Inativa</span>}
          </div>
        ))}
        {list.length === 0 && <div className="empty">Nenhuma conta cadastrada.</div>}
      </div>
      {editing && <AccountModal account={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
