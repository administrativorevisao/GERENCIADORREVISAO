import { useState } from "react";
import { useAuth } from "../../shared/auth/AuthContext";
import { isAdmin } from "../../shared/auth/types";
import { STANDARD_DEPARTMENTS } from "../../core/companies/companies";
import { dueStatus, fmtDate, todayISO } from "../../shared/lib/dates";
import { fmtMoney } from "../../shared/lib/money";
import { useTxns, useUpdateTxn } from "./useFinance";
import { APPROVAL_STATUS_LABEL, DRE_GROUPS, type FinanceTxn } from "./types";
import { PayableModal } from "./PayableModal";
import { TxnModal } from "./TxnModal";
import { DateFilterBar } from "./DateFilterBar";

function deptName(id: string | null) {
  return STANDARD_DEPARTMENTS.find((d) => d.id === id)?.name ?? "—";
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${names[Number(m) - 1]}/${y}`;
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
  const [dayFilter, setDayFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [paidFilter, setPaidFilter] = useState<"" | "pago" | "naoPago">("");

  if (isLoading) return <div className="empty">Carregando…</div>;

  const all = txns ?? [];
  const despesas = all.filter((t) => t.type === "despesa" && t.status !== "cancelado");
  const pendingApproval = despesas.filter((t) => t.approvalStatus === "pendente");
  const fixedActive = despesas.filter((t) => t.isFixed && t.status !== "pago");
  const fixedTotal = fixedActive.reduce((sum, t) => sum + t.amount, 0);

  const filtered = despesas
    .filter((t) => !deptFilter || t.departmentId === deptFilter)
    .filter((t) => !dreFilter || t.dreGroup === dreFilter)
    .filter((t) => !dayFilter || t.dueDate === dayFilter)
    .filter((t) => !monthFilter || t.dueDate.slice(0, 7) === monthFilter)
    .filter((t) => !paidFilter || (paidFilter === "pago" ? t.status === "pago" : t.status !== "pago"))
    .slice()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Quanto já foi de fato pago no mês (respeita o filtro de mês, se algum
  // estiver ativo; senão usa o mês atual) — data do pagamento, não vencimento.
  const spentMonth = monthFilter || todayISO().slice(0, 7);
  const spentTotal = despesas
    .filter((t) => t.status === "pago" && (t.paidDate ?? t.dueDate).slice(0, 7) === spentMonth)
    .reduce((sum, t) => sum + t.amount, 0);

  const fixedNeedsApproval = filtered.filter((t) => t.isFixed && t.requiresApproval);
  const subscriptions = filtered.filter((t) => t.isFixed && !t.requiresApproval);
  const variable = filtered.filter((t) => !t.isFixed);

  const receivables = all
    .filter((t) => t.type === "receita" && t.status !== "pago" && t.status !== "cancelado")
    .slice()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Fluxo de caixa futuro: tudo que ainda não foi pago, agrupado por mês de
  // vencimento — dá pra ver o que está comprometido (já aprovado) e o que
  // ainda depende de aprovação em cada mês à frente.
  const upcoming = despesas.filter((t) => t.status !== "pago" && t.dueDate >= todayISO().slice(0, 7) + "-01");
  const byMonth = new Map<string, { approved: number; pending: number }>();
  upcoming.forEach((t) => {
    const ym = t.dueDate.slice(0, 7);
    const entry = byMonth.get(ym) ?? { approved: 0, pending: 0 };
    if (t.approvalStatus === "aprovado") entry.approved += t.amount;
    else if (t.approvalStatus === "pendente") entry.pending += t.amount;
    byMonth.set(ym, entry);
  });
  const months = Array.from(byMonth.keys()).sort();

  async function quickApprove(t: FinanceTxn) {
    if (!profile) return;
    await updateTxn.mutateAsync({ ...t, approvalStatus: "aprovado", approvedBy: profile.id, approvedAt: new Date().toISOString() });
  }
  async function quickReject(t: FinanceTxn) {
    if (!profile) return;
    await updateTxn.mutateAsync({ ...t, approvalStatus: "rejeitado", approvedBy: profile.id, approvedAt: new Date().toISOString() });
  }

  function payablesTable(title: string, rows: FinanceTxn[], emptyHint: string) {
    return (
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <div className="section-title" style={{ marginTop: 0 }}>{title} <span className="count">{rows.length}</span></div>
        {rows.length === 0 && <div className="hint">{emptyHint}</div>}
        {rows.length > 0 && (
          <div className="tbl-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Descrição</th><th>Setor</th><th>Grupo DRE</th><th>Vencimento</th>
                  <th>Valor</th><th>Aprovação</th><th>Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} onClick={() => setEditing(t)} style={{ cursor: "pointer" }}>
                    <td>
                      <b>{t.description}</b>
                      {t.notes && <div className="muted" style={{ fontSize: 11 }}>{t.notes}</div>}
                    </td>
                    <td>{deptName(t.departmentId)}</td>
                    <td>{DRE_GROUPS[t.dreGroup]}</td>
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
    );
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
                    {t.isFixed && " · fixa"}
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
          <div className="stack">
            <span className="muted" style={{ fontSize: 11.5 }}>Já gasto em {monthLabel(spentMonth)}</span>
            <b style={{ fontSize: 18 }}>{fmtMoney(spentTotal)}</b>
          </div>
          <span style={{ flex: 1 }} />
          <DateFilterBar day={dayFilter} month={monthFilter} onDayChange={setDayFilter} onMonthChange={setMonthFilter} dayLabel="Vencimento" monthLabel="Mês de vencimento" />
          <select className="input" style={{ width: "auto" }} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="">Setor: todos</option>
            {STANDARD_DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="input" style={{ width: "auto" }} value={dreFilter} onChange={(e) => setDreFilter(e.target.value)}>
            <option value="">Grupo DRE: todos</option>
            {Object.entries(DRE_GROUPS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="input" style={{ width: "auto" }} value={paidFilter} onChange={(e) => setPaidFilter(e.target.value as typeof paidFilter)}>
            <option value="">Pagamento: todos</option>
            <option value="pago">Pagas</option>
            <option value="naoPago">Não pagas</option>
          </select>
        </div>
      </div>

      {payablesTable("Contas fixas sujeitas a aprovação", fixedNeedsApproval, "Nenhuma conta fixa que sempre exige aprovação (ex: aluguel).")}
      {payablesTable("Assinaturas recorrentes", subscriptions, "Nenhuma assinatura recorrente cadastrada.")}
      {payablesTable("Contas variáveis", variable, "Nenhuma conta variável com esses filtros.")}

      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <div className="section-title" style={{ marginTop: 0 }}>Fluxo de caixa futuro (despesas ainda não pagas)</div>
        {months.length === 0 && <div className="hint">Nada pendente pra frente.</div>}
        {months.length > 0 && (
          <div className="tbl-wrap">
            <table className="data">
              <thead><tr><th>Mês</th><th>Aprovado (a pagar)</th><th>Aguardando aprovação</th><th>Total previsto</th></tr></thead>
              <tbody>
                {months.map((ym) => {
                  const e = byMonth.get(ym)!;
                  return (
                    <tr key={ym}>
                      <td><b>{monthLabel(ym)}</b></td>
                      <td>{fmtMoney(e.approved)}</td>
                      <td className={e.pending > 0 ? "muted" : undefined}>{fmtMoney(e.pending)}</td>
                      <td><b>{fmtMoney(e.approved + e.pending)}</b></td>
                    </tr>
                  );
                })}
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
