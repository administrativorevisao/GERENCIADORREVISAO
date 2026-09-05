import { useState } from "react";
import { useCreateAccount, useUpdateAccount } from "./useFinance";
import type { FinanceAccount } from "./types";
import { todayISO } from "../../shared/lib/dates";

export function AccountModal({ account, onClose }: { account: FinanceAccount | null; onClose: () => void }) {
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const [name, setName] = useState(account?.name ?? "");
  const [bank, setBank] = useState(account?.bank ?? "");
  const [type, setType] = useState<FinanceAccount["type"]>(account?.type ?? "corrente");
  const [openingBalance, setOpeningBalance] = useState(String(account?.openingBalance ?? 0));
  const [openingDate, setOpeningDate] = useState(account?.openingDate ?? todayISO());

  const saving = createAccount.isPending || updateAccount.isPending;

  async function handleSave() {
    if (!name.trim()) return;
    const patch = { name: name.trim(), bank, type, openingBalance: Number(openingBalance) || 0, openingDate };
    if (account) await updateAccount.mutateAsync({ ...account, ...patch });
    else await createAccount.mutateAsync(patch);
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{account ? "Editar conta" : "Nova conta bancária"}</h3></div>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="acc-name">Nome</label>
            <input id="acc-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="acc-bank">Banco</label>
              <input id="acc-bank" className="input" value={bank} onChange={(e) => setBank(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="acc-type">Tipo</label>
              <select id="acc-type" className="input" value={type} onChange={(e) => setType(e.target.value as FinanceAccount["type"])}>
                <option value="corrente">Corrente</option>
                <option value="poupanca">Poupança</option>
                <option value="caixa">Caixa</option>
                <option value="investimento">Investimento</option>
              </select>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="acc-opening">Saldo inicial</label>
              <input id="acc-opening" type="number" step="0.01" className="input" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="acc-opening-date">Data do saldo inicial</label>
              <input id="acc-opening-date" type="date" className="input" value={openingDate} onChange={(e) => setOpeningDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
