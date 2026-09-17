import { useState } from "react";
import { useAuth } from "../../shared/auth/AuthContext";
import { isAdmin } from "../../shared/auth/types";
import { STANDARD_DEPARTMENTS } from "../../core/companies/companies";
import { userName, useUsers } from "../../core/team/useUsers";
import { todayISO, fmtDate } from "../../shared/lib/dates";
import { APPROVAL_CUTOFF_DATE, DRE_GROUPS, APPROVAL_STATUS_LABEL, type ApprovalStatus, type DreGroup, type FinanceTxn } from "./types";
import { useAccounts, useCreateTxn, useUpdateTxn } from "./useFinance";

// Modal dedicado de Contas a Pagar (diferente do TxnModal genérico usado no
// Fluxo de Caixa): já nasce com o fluxo de autorização do CEO — toda
// despesa nova criada aqui entra "Aguardando aprovação" e só pode ser
// marcada como paga depois de aprovada. Também é aqui que a despesa é
// alocada por setor e por grupo do DRE, e onde fica o campo de observação
// livre.
export function PayableModal({ txn, onClose }: { txn: FinanceTxn | null; onClose: () => void }) {
  const { profile } = useAuth();
  const admin = isAdmin(profile);
  const { data: accounts } = useAccounts();
  const { data: users } = useUsers();
  const createTxn = useCreateTxn();
  const updateTxn = useUpdateTxn();

  const [description, setDescription] = useState(txn?.description ?? "");
  const [counterparty, setCounterparty] = useState(txn?.counterparty ?? "");
  const [amount, setAmount] = useState(String(txn?.amount ?? 0));
  const [dueDate, setDueDate] = useState(txn?.dueDate ?? todayISO());
  const [departmentId, setDepartmentId] = useState(txn?.departmentId ?? "");
  const [dreGroup, setDreGroup] = useState<DreGroup>(txn?.dreGroup ?? "despesasOperacionais");
  const [category, setCategory] = useState(txn?.category ?? "");
  const [isFixed, setIsFixed] = useState(txn?.isFixed ?? false);
  // Padrão pra conta fixa nova: pré-aprovada (assinatura); só exige
  // aprovação sempre se marcado explicitamente (ex: aluguel).
  const [requiresApproval, setRequiresApproval] = useState(txn?.requiresApproval ?? false);
  const [notes, setNotes] = useState(txn?.notes ?? "");
  const [accountId, setAccountId] = useState(txn?.accountId ?? "");

  const saving = createTxn.isPending || updateTxn.isPending;
  const approvalStatus: ApprovalStatus = txn?.approvalStatus ?? "pendente";
  const canPay = !txn || approvalStatus === "aprovado";

  // Despesa variável sempre exige aprovação — só uma despesa fixa pode virar
  // assinatura pré-aprovada (desmarcando a caixinha abaixo).
  const effectiveRequiresApproval = !isFixed || requiresApproval;
  // Vencimento anterior ao início do fluxo de aprovação é dado histórico
  // (já reconciliado no DRE) — não passa pelo Terminal, entra aprovada e paga.
  const isHistorical = dueDate < APPROVAL_CUTOFF_DATE;

  async function handleSave() {
    if (!description.trim()) return;
    const patch: Partial<FinanceTxn> = {
      type: "despesa", description: description.trim(), counterparty, amount: Number(amount) || 0,
      dueDate, departmentId: departmentId || null, dreGroup, category, isFixed,
      requiresApproval: effectiveRequiresApproval, notes,
      accountId: accountId || null, competenceMonth: dueDate.slice(0, 7),
    };
    if (txn) await updateTxn.mutateAsync({ ...txn, ...patch });
    else {
      await createTxn.mutateAsync({
        ...patch,
        status: isHistorical ? "pago" : "pendente",
        paidDate: isHistorical ? dueDate : null,
        approvalStatus: isHistorical ? "aprovado" : (effectiveRequiresApproval ? "pendente" : "aprovado"),
      });
    }
    onClose();
  }

  async function handleApprove() {
    if (!txn || !profile) return;
    await updateTxn.mutateAsync({ ...txn, approvalStatus: "aprovado", approvedBy: profile.id, approvedAt: new Date().toISOString() });
    onClose();
  }

  async function handleReject() {
    if (!txn || !profile) return;
    await updateTxn.mutateAsync({ ...txn, approvalStatus: "rejeitado", approvedBy: profile.id, approvedAt: new Date().toISOString() });
    onClose();
  }

  async function handleTogglePaid() {
    if (!txn) return;
    const nowPaid = txn.status !== "pago";
    await updateTxn.mutateAsync({ ...txn, status: nowPaid ? "pago" : "pendente", paidDate: nowPaid ? todayISO() : null });
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{txn ? "Editar conta a pagar" : "Nova conta a pagar"}</h3></div>
        <div className="modal-body">
          {txn && (
            <div className="row" style={{ alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span
                className={`badge ${approvalStatus === "aprovado" ? "b-done" : approvalStatus === "rejeitado" ? "b-high" : "b-soft"}`}
              >
                {APPROVAL_STATUS_LABEL[approvalStatus]}
              </span>
              {txn.approvedBy && txn.approvedAt && (
                <span className="muted" style={{ fontSize: 11.5 }}>
                  por {userName(users, txn.approvedBy)} em {fmtDate(txn.approvedAt.slice(0, 10))}
                </span>
              )}
              <span style={{ flex: 1 }} />
              <span className={`badge ${txn.status === "pago" ? "b-done" : "b-soft"}`}>{txn.status === "pago" ? "Pago" : "Não pago"}</span>
            </div>
          )}
          <div className="field">
            <label htmlFor="pay-desc">Descrição</label>
            <input id="pay-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label htmlFor="pay-counter">Fornecedor / Contraparte</label>
            <input id="pay-counter" className="input" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="pay-amount">Valor</label>
              <input id="pay-amount" type="number" step="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="pay-due">Vencimento</label>
              <input id="pay-due" type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="pay-dept">Setor</label>
              <select id="pay-dept" className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">— Nenhum —</option>
                {STANDARD_DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pay-dre">Grupo DRE</label>
              <select id="pay-dre" className="input" value={dreGroup} onChange={(e) => setDreGroup(e.target.value as DreGroup)}>
                {Object.entries(DRE_GROUPS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="pay-category">Categoria</label>
              <input id="pay-category" className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="pay-account">Conta de pagamento</label>
              <select id="pay-account" className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">— Nenhuma —</option>
                {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <label className="row" style={{ alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={isFixed} onChange={(e) => setIsFixed(e.target.checked)} />
            <span>Despesa fixa (recorrente todo mês)</span>
          </label>
          {isFixed && (
            <label className="row" style={{ alignItems: "center", gap: 8, cursor: "pointer", marginTop: 6, marginLeft: 22 }}>
              <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} />
              <span className="muted" style={{ fontSize: 12.5 }}>
                Sempre exigir aprovação do CEO (ex: aluguel) — desmarcado = assinatura recorrente pré-aprovada (ex: SaaS)
              </span>
            </label>
          )}
          {!txn && isHistorical && (
            <p className="hint" style={{ marginTop: 4 }}>
              Vencimento anterior a {APPROVAL_CUTOFF_DATE.split("-").reverse().join("/")}: entra direto como aprovada e paga (dado histórico, sem passar pelo Terminal).
            </p>
          )}
          <div className="field">
            <label htmlFor="pay-notes">Observações</label>
            <textarea id="pay-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Qualquer observação livre sobre esta conta." />
          </div>
        </div>
        <div className="modal-foot" style={{ flexWrap: "wrap" }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <span style={{ flex: 1 }} />
          {txn && admin && approvalStatus === "pendente" && (
            <>
              <button className="btn sm" style={{ borderColor: "var(--danger, #d33)", color: "var(--danger, #d33)" }} onClick={handleReject} disabled={saving}>
                Rejeitar
              </button>
              <button className="btn sm primary" onClick={handleApprove} disabled={saving}>Aprovar</button>
            </>
          )}
          {txn && canPay && (
            <button className="btn sm" onClick={handleTogglePaid} disabled={saving}>
              {txn.status === "pago" ? "Marcar como não pago" : "Marcar como pago"}
            </button>
          )}
          <button className="btn primary" onClick={handleSave} disabled={saving || !description.trim()}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
