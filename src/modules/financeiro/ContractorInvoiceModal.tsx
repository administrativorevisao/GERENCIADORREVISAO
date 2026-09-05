import { useState } from "react";
import { useUsers } from "../../core/team/useUsers";
import { contractorLabel } from "./api";
import { useAccounts, useCreateContractorInvoice, useMarkContractorInvoicePaid, useTxns } from "./useFinance";
import type { FinanceContractorInvoice } from "./types";
import { todayISO } from "../../shared/lib/dates";

export function ContractorInvoiceModal({ invoice, onClose }: { invoice: FinanceContractorInvoice | null; onClose: () => void }) {
  const { data: users } = useUsers();
  const { data: accounts } = useAccounts();
  const { data: txns } = useTxns();
  const createInvoice = useCreateContractorInvoice();
  const markPaid = useMarkContractorInvoicePaid();

  const [userId, setUserId] = useState(invoice?.userId ?? "");
  const [contractorName, setContractorName] = useState(invoice?.contractorName ?? "");
  const [nfNumber, setNfNumber] = useState(invoice?.nfNumber ?? "");
  const [amount, setAmount] = useState(String(invoice?.amount ?? 0));
  const [competenceMonth, setCompetenceMonth] = useState(invoice?.competenceMonth ?? todayISO().slice(0, 7));
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? todayISO());
  const [payAccountId, setPayAccountId] = useState(accounts?.[0]?.id ?? "");
  const [payDate, setPayDate] = useState(todayISO());

  async function handleSave() {
    if (!userId && !contractorName.trim()) return;
    await createInvoice.mutateAsync({ userId: userId || null, contractorName, nfNumber, amount: Number(amount) || 0, competenceMonth, dueDate });
    onClose();
  }

  async function handleMarkPaid() {
    if (!invoice || !payAccountId) return;
    const label = contractorLabel(invoice, users?.find((u) => u.id === invoice.userId)?.shortName ?? null);
    await markPaid.mutateAsync({ invoice, accountId: payAccountId, paidDate: payDate, label, txns: txns ?? [] });
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{invoice ? "NF de contratado" : "Nova NF de contratado"}</h3></div>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="nf-user">Colaborador (se cadastrado)</label>
            <select id="nf-user" className="input" value={userId} onChange={(e) => setUserId(e.target.value)} disabled={!!invoice}>
              <option value="">— Nenhum (usar nome livre) —</option>
              {users?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          {!userId && (
            <div className="field">
              <label htmlFor="nf-name">Nome do contratado</label>
              <input id="nf-name" className="input" value={contractorName} onChange={(e) => setContractorName(e.target.value)} disabled={!!invoice} />
            </div>
          )}
          <div className="row">
            <div className="field">
              <label htmlFor="nf-number">Número da NF</label>
              <input id="nf-number" className="input" value={nfNumber} onChange={(e) => setNfNumber(e.target.value)} disabled={!!invoice} />
            </div>
            <div className="field">
              <label htmlFor="nf-amount">Valor</label>
              <input id="nf-amount" type="number" step="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={!!invoice} />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="nf-competence">Competência</label>
              <input id="nf-competence" type="month" className="input" value={competenceMonth} onChange={(e) => setCompetenceMonth(e.target.value)} disabled={!!invoice} />
            </div>
            <div className="field">
              <label htmlFor="nf-due">Vencimento</label>
              <input id="nf-due" type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!!invoice} />
            </div>
          </div>

          {invoice && invoice.status !== "paga" && (
            <div className="hint" style={{ marginTop: 14 }}>
              <div className="section-title" style={{ fontSize: 13 }}>Marcar como paga</div>
              <div className="row">
                <div className="field">
                  <label htmlFor="nf-pay-account">Conta</label>
                  <select id="nf-pay-account" className="input" value={payAccountId} onChange={(e) => setPayAccountId(e.target.value)}>
                    <option value="">— Selecione —</option>
                    {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="nf-pay-date">Data</label>
                  <input id="nf-pay-date" type="date" className="input" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
              </div>
              <button className="btn primary sm" onClick={handleMarkPaid} disabled={!payAccountId || markPaid.isPending}>
                {markPaid.isPending ? "Confirmando…" : "Confirmar pagamento"}
              </button>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Fechar</button>
          {!invoice && (
            <button className="btn primary" onClick={handleSave} disabled={createInvoice.isPending || (!userId && !contractorName.trim())}>
              {createInvoice.isPending ? "Salvando…" : "Salvar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
