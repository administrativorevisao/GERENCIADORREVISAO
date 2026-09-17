import { useState } from "react";
import { fmtDate } from "../../shared/lib/dates";
import { fmtMoney } from "../../shared/lib/money";
import { useTxns } from "./useFinance";
import { FIN_TXN_STATUS, type FinanceTxn } from "./types";
import { TxnModal } from "./TxnModal";
import { SheetSyncPanel } from "./SheetSyncPanel";
import { DateFilterBar } from "./DateFilterBar";

export function FluxoCaixaView() {
  const { data: txns, isLoading, error } = useTxns();
  const [editing, setEditing] = useState<FinanceTxn | null | "new">(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [detailFilter, setDetailFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  if (isLoading) return <div className="empty">Carregando lançamentos…</div>;
  if (error) return <div className="empty">Erro: {(error as Error).message}</div>;

  const all = txns ?? [];
  const categories = Array.from(new Set(all.map((t) => t.category).filter(Boolean))).sort();
  const details = Array.from(new Set(all.map((t) => t.detail).filter(Boolean))).sort();

  const list = all
    .filter((t) => !categoryFilter || t.category === categoryFilter)
    .filter((t) => !detailFilter || t.detail === detailFilter)
    .filter((t) => !dayFilter || t.dueDate === dayFilter)
    .filter((t) => !monthFilter || t.dueDate.slice(0, 7) === monthFilter)
    .slice()
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  return (
    <div>
      <SheetSyncPanel view="fluxoCaixa" />
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>Fluxo de Caixa <span className="count">{list.length}</span></div>
        <span style={{ flex: 1 }} />
        <DateFilterBar day={dayFilter} month={monthFilter} onDayChange={setDayFilter} onMonthChange={setMonthFilter} />
        <select className="input" style={{ width: "auto" }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Categoria Revisão: todas</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input" style={{ width: "auto" }} value={detailFilter} onChange={(e) => setDetailFilter(e.target.value)}>
          <option value="">Detalhamento: todos</option>
          {details.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <button className="btn primary sm" onClick={() => setEditing("new")}>+ Novo lançamento</button>
      </div>
      {list.length === 0 && <div className="empty">{all.length === 0 ? "Nenhum lançamento ainda." : "Nenhum lançamento com esse filtro."}</div>}
      {list.length > 0 && (
        <div className="tbl-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Descrição</th><th>Categoria Revisão</th><th>Detalhamento</th><th>Tipo</th><th>Valor</th>
                <th>Status</th><th>Vencimento</th><th>Competência</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id} onClick={() => setEditing(t)} style={{ cursor: "pointer" }}>
                  <td>{t.description}</td>
                  <td>{t.category}</td>
                  <td>{t.detail}</td>
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
