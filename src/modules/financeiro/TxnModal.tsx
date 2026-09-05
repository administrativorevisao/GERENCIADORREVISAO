import { useState } from "react";
import { DRE_GROUPS, FIN_TXN_STATUS, type DreGroup, type FinTxnStatus, type FinanceTxn } from "./types";
import { useAccounts, useCreateTxn, useUpdateTxn } from "./useFinance";
import { todayISO } from "../../shared/lib/dates";

export function TxnModal({ txn, onClose }: { txn: FinanceTxn | null; onClose: () => void }) {
  const { data: accounts } = useAccounts();
  const createTxn = useCreateTxn();
  const updateTxn = useUpdateTxn();

  const [type, setType] = useState<"receita" | "despesa">(txn?.type ?? "despesa");
  const [description, setDescription] = useState(txn?.description ?? "");
  const [counterparty, setCounterparty] = useState(txn?.counterparty ?? "");
  const [amount, setAmount] = useState(String(txn?.amount ?? 0));
  const [status, setStatus] = useState<FinTxnStatus>(txn?.status ?? "pendente");
  const [dueDate, setDueDate] = useState(txn?.dueDate ?? todayISO());
  const [paidDate, setPaidDate] = useState(txn?.paidDate ?? "");
  const [accountId, setAccountId] = useState(txn?.accountId ?? "");
  const [dreGroup, setDreGroup] = useState<DreGroup>(txn?.dreGroup ?? "despesasOperacionais");
  const [category, setCategory] = useState(txn?.category ?? "");
  const [competenceMonth, setCompetenceMonth] = useState(txn?.competenceMonth ?? todayISO().slice(0, 7));

  const saving = createTxn.isPending || updateTxn.isPending;

  async function handleSave() {
    if (!description.trim()) return;
    const patch: Partial<FinanceTxn> = {
      type, description: description.trim(), counterparty, amount: Number(amount) || 0, status,
      dueDate, paidDate: status === "pago" ? (paidDate || todayISO()) : null,
      accountId: accountId || null, dreGroup, category, competenceMonth,
    };
    if (txn) await updateTxn.mutateAsync({ ...txn, ...patch });
    else await createTxn.mutateAsync(patch);
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{txn ? "Editar lançamento" : "Novo lançamento"}</h3></div>
        <div className="modal-body">
          <div className="row">
            <div className="field">
              <label htmlFor="fx-type">Tipo</label>
              <select id="fx-type" className="input" value={type} onChange={(e) => setType(e.target.value as "receita" | "despesa")}>
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="fx-amount">Valor</label>
              <input id="fx-amount" type="number" step="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="fx-desc">Descrição</label>
            <input id="fx-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label htmlFor="fx-counter">Contraparte</label>
            <input id="fx-counter" className="input" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="fx-status">Status</label>
              <select id="fx-status" className="input" value={status} onChange={(e) => setStatus(e.target.value as FinTxnStatus)}>
                {Object.entries(FIN_TXN_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="fx-due">Vencimento</label>
              <input id="fx-due" type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            {status === "pago" && (
              <div className="field">
                <label htmlFor="fx-paid">Data de pagamento</label>
                <input id="fx-paid" type="date" className="input" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
              </div>
            )}
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="fx-account">Conta</label>
              <select id="fx-account" className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">— Nenhuma —</option>
                {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="fx-competence">Competência</label>
              <input id="fx-competence" type="month" className="input" value={competenceMonth} onChange={(e) => setCompetenceMonth(e.target.value)} />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="fx-dregroup">Grupo DRE</label>
              <select id="fx-dregroup" className="input" value={dreGroup} onChange={(e) => setDreGroup(e.target.value as DreGroup)}>
                {Object.entries(DRE_GROUPS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="fx-category">Categoria</label>
              <input id="fx-category" className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={saving || !description.trim()}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
