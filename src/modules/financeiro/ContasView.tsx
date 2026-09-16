import { useState } from "react";
import { useAuth } from "../../shared/auth/AuthContext";
import { isAdmin } from "../../shared/auth/types";
import { STANDARD_DEPARTMENTS } from "../../core/companies/companies";
import { dueStatus, fmtDate } from "../../shared/lib/dates";
import { fmtMoney } from "../../shared/lib/money";
import { useTxns, useUpdateTxn } from "./useFinance";
import { APPROVAL_STATUS_LABEL, DRE_GROUPS, type FinanceTxn } from "./types";
import { PayableModal } from "./PayableModal";
import { TxnModal } from "./TxnModal";

function deptName(id: string | null) {
  return STANDARD_DEPARTMENTS.find((d) => d.id === id)?.name ?? "—";
}

export function ContasView() {
  const { profile } = useAuth();
  const admin = isAdmin(profile);
  const { data: txns, isLoading } = useTxns();
  const updateTxn = useUpdateTxn();
  const [editing, setEditing] = useState<FinanceTxn | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingReceivable, setEditingReceivable] = useState<FinanceTxn | null>(null);
  const [deptFilter, setDeptFilter] = useState("");
  const [dreFilter, setDreFilter] = useState("");
  const [fixedFilter, setFixedFilter] = useState<"" | "fixo" | "variavel">("");
  const [paidFilter, setPaidFilter] = useState<"" | "pago" | "naoPago">("");

  if (isLoading) return <div className="empty">Carregando…</div>;

  const all = txns ?? [];
  const despesas = all.filter((t) => t.type === "despesa" && t.status !== "cancelado");
  const pendingApproval = despesas.filter((t) => t.approvalStatus === "pendente");
  const fixedActive = despesas.filter((t) => t.isFixed && t.status !== "pago");
  const fixedTotal = fixedActive.reduce((sum, t) => sum + t.amount, 0);

  const payables = despesas
    .filter((t) => !deptFilter || t.departmentId === deptFilter)
    .filter((t) => !dreFilter || t.dreGroup === dreFilter)
    .filter((t) => !fixedFilter || (fixedFilter === "fixo" ? t.isFixed : !t.isFixed))
    .filter((t) => !paidFilter || (paidFilter === "pago" ? t.status === "pago" : t.status !== "pago"))
    .slice()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const receivables = all
    .filter((t) => t.type === "receita" && t.status !== "pago" && t.status !== "cancelado")
    .slice()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  async function quickApprove(t: FinanceTxn) {
    if (!profile) return;
    await updateTxn.mutateAsync({ ...t, approvalStatus: "aprovado", approvedBy: profile.id, approvedAt: new Date().toISOString() });
  }
  async function quickReject(t: FinanceTxn) {
    if (!profile) return;
    await updateTxn.mutateAsync({ ...t, approvalStatus: "rejeitado", approvedBy: profile.id, approvedAt: new Date().toISOString() });
  }

  return (
    <div>
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>Contas a Pagar/Receber</div>
        <span style={{ flex: 1 }} />
        <button className="btn primary sm" onClick={() => setCreating(true)}>+ Nova conta a pagar</button>
      </div>

      {admin && pendingApproval.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: 14, borderLeft: "4px solid var(--warn, #d97706)" }}>
          <div className="section-title" style={{ marginTop: 0 }}>
            <span className="msi">gavel</span> Terminal de aprovação <span className="count">{pendingApproval.length}</span>
          </div>
          {pendingApproval
            .slice()
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
            .map((t) => (
              <div className="list-item" key={t.id}>
                <div className="stack" style={{ flex: 1, cursor: "pointer" }} onClick={() => setEditing(t)}>
                  <b style={{ fontSize: 13.5 }}>{t.description}</b>
                  <span className="muted" style={{ fontSize: 11.5 }}>
                    {t.counterparty || "—"} · {deptName(t.departmentId)} · vence {fmtDate(t.dueDate)}
                  </span>
                </div>
                <b>{fmtMoney(t.amount)}</b>
                <button className="btn sm" style={{ borderColor: "var(--danger, #d33)", color: "var(--danger, #d33)" }} onClick={() => quickReject(t)} disabled={updateTxn.isPending}>
                  Rejeitar
                </button>
                <button className="btn sm primary" onClick={() => quickApprove(t)} disabled={updateTxn.isPending}>Aprovar</button>
              </div>
            ))}
        </div>
      )}

      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <div className="row" style={{ alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div className="stack">
            <span className="muted" style={{ fontSize: 11.5 }}>Gastos fixos ativos</span>
            <b style={{ fontSize: 18 }}>{fixedActive.length} · {fmtMoney(fixedTotal)}/mês</b>
          </div>
          <span style={{ flex: 1 }} />
          <select className="input" style={{ width: "auto" }} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="">Setor: todos</option>
            {STANDARD_DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="input" style={{ width: "auto" }} value={dreFilter} onChange={(e) => setDreFilter(e.target.value)}>
            <option value="">Grupo DRE: todos</option>
            {Object.entries(DRE_GROUPS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="input" style={{ width: "auto" }} value={fixedFilter} onChange={(e) => setFixedFilter(e.target.value as typeof fixedFilter)}>
            <option value="">Fixo/variável: todos</option>
            <option value="fixo">Só fixas</option>
            <option value="variavel">Só variáveis</option>
          </select>
          <select className="input" style={{ width: "auto" }} value={paidFilter} onChange={(e) => setPaidFilter(e.target.value as typeof paidFilter)}>
            <option value="">Pagamento: todos</option>
            <option value="pago">Pagas</option>
            <option value="naoPago">Não pagas</option>
          </select>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <div className="section-title" style={{ marginTop: 0 }}>A pagar <span className="count">{payables.length}</span></div>
        {payables.length === 0 && <div className="hint">Nada encontrado com esses filtros.</div>}
        {payables.length > 0 && (
          <div className="tbl-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Descrição</th><th>Setor</th><th>Grupo DRE</th><th>Fixo</th><th>Vencimento</th>
                  <th>Valor</th><th>Aprovação</th><th>Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {payables.map((t) => (
                  <tr key={t.id} onClick={() => setEditing(t)} style={{ cursor: "pointer" }}>
                    <td>
                      <b>{t.description}</b>
                      {t.notes && <div className="muted" style={{ fontSize: 11 }}>{t.notes}</div>}
                    </td>
                    <td>{deptName(t.departmentId)}</td>
                    <td>{DRE_GROUPS[t.dreGroup]}</td>
                    <td>{t.isFixed ? <span className="badge b-soft">Fixo</span> : ""}</td>
                    <td><span className={`badge b-${dueStatus(t.dueDate, t.status === "pago" ? "done" : "todo")}`}>{fmtDate(t.dueDate)}</span></td>
                    <td>{fmtMoney(t.amount)}</td>
                    <td>
                      <span className={`badge ${t.approvalStatus === "aprovado" ? "b-done" : t.approvalStatus === "rejeitado" ? "b-high" : "b-soft"}`}>
                        {APPROVAL_STATUS_LABEL[t.approvalStatus]}
                      </span>
                    </td>
                    <td><span className={`badge ${t.status === "pago" ? "b-done" : "b-soft"}`}>{t.status === "pago" ? "Pago" : "Não pago"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <div className="section-title" style={{ marginTop: 0 }}>A receber <span className="count">{receivables.length}</span></div>
        {receivables.length === 0 && <div className="hint">Nada pendente.</div>}
        {receivables.map((t) => (
          <div className="list-item" key={t.id} onClick={() => setEditingReceivable(t)}>
            <div className="stack" style={{ flex: 1 }}>
              <b style={{ fontSize: 13.5 }}>{t.description}</b>
              <span className="muted" style={{ fontSize: 11.5 }}>{t.counterparty}</span>
            </div>
            <span className={`badge b-${dueStatus(t.dueDate, "todo")}`}>{fmtDate(t.dueDate)}</span>
            <b>{fmtMoney(t.amount)}</b>
          </div>
        ))}
      </div>

      {(editing || creating) && <PayableModal txn={editing} onClose={() => { setEditing(null); setCreating(false); }} />}
      {editingReceivable && <TxnModal txn={editingReceivable} onClose={() => setEditingReceivable(null)} />}
    </div>
  );
}
