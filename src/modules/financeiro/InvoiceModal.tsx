import { useState } from "react";
import { useAccounts, useCreateInvoice, useMarkInvoicePaid, useTxns } from "./useFinance";
import type { FinanceInvoice } from "./types";
import { todayISO } from "../../shared/lib/dates";

export function InvoiceModal({ invoice, onClose }: { invoice: FinanceInvoice | null; onClose: () => void }) {
  const { data: accounts } = useAccounts();
  const { data: txns } = useTxns();
  const createInvoice = useCreateInvoice();
  const markPaid = useMarkInvoicePaid();

  const [clientName, setClientName] = useState(invoice?.clientName ?? "");
  const [number, setNumber] = useState(invoice?.number ?? "");
  const [amount, setAmount] = useState(String(invoice?.amount ?? 0));
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? todayISO());
  const [description, setDescription] = useState(invoice?.description ?? "");
  const [payAccountId, setPayAccountId] = useState(accounts?.[0]?.id ?? "");
  const [payDate, setPayDate] = useState(todayISO());

  async function handleSave() {
    if (!clientName.trim()) return;
    await createInvoice.mutateAsync({ clientName: clientName.trim(), number, amount: Number(amount) || 0, dueDate, description });
    onClose();
  }

  async function handleMarkPaid() {
    if (!invoice || !payAccountId) return;
    await markPaid.mutateAsync({ invoice, accountId: payAccountId, paidDate: payDate, txns: txns ?? [] });
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{invoice ? "Fatura" : "Nova fatura"}</h3></div>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="inv-client">Cliente</label>
            <input id="inv-client" className="input" value={clientName} onChange={(e) => setClientName(e.target.value)} disabled={!!invoice} autoFocus />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="inv-number">Número</label>
              <input id="inv-number" className="input" value={number} onChange={(e) => setNumber(e.target.value)} disabled={!!invoice} />
            </div>
            <div className="field">
              <label htmlFor="inv-amount">Valor</label>
              <input id="inv-amount" type="number" step="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={!!invoice} />
            </div>
            <div className="field">
              <label htmlFor="inv-due">Vencimento</label>
              <input id="inv-due" type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!!invoice} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="inv-desc">Descrição</label>
            <input id="inv-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} disabled={!!invoice} />
          </div>

          {invoice && invoice.status !== "paga" && (
            <div className="hint" style={{ marginTop: 14 }}>
              <div className="section-title" style={{ fontSize: 13 }}>Marcar como paga</div>
              <div className="row">
                <div className="field">
                  <label htmlFor="inv-pay-account">Conta de recebimento</label>
                  <select id="inv-pay-account" className="input" value={payAccountId} onChange={(e) => setPayAccountId(e.target.value)}>
                    <option value="">— Selecione —</option>
                    {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="inv-pay-date">Data</label>
                  <input id="inv-pay-date" type="date" className="input" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
              </div>
              <button className="btn primary sm" onClick={handleMarkPaid} disabled={!payAccountId || markPaid.isPending}>
                {markPaid.isPending ? "Confirmando…" : "Confirmar recebimento"}
              </button>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Fechar</button>
          {!invoice && (
            <button className="btn primary" onClick={handleSave} disabled={createInvoice.isPending || !clientName.trim()}>
              {createInvoice.isPending ? "Salvando…" : "Salvar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
