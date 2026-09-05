import { useState } from "react";
import { useUsers } from "../../core/team/useUsers";
import { payrollNet } from "./api";
import { useAccounts, useCreatePayroll, useMarkPayrollPaid, useTxns } from "./useFinance";
import type { FinancePayroll } from "./types";
import { fmtMoney } from "../../shared/lib/money";
import { todayISO } from "../../shared/lib/dates";

export function PayrollModal({ payroll, onClose }: { payroll: FinancePayroll | null; onClose: () => void }) {
  const { data: users } = useUsers();
  const { data: accounts } = useAccounts();
  const { data: txns } = useTxns();
  const createPayroll = useCreatePayroll();
  const markPaid = useMarkPayrollPaid();

  const [userId, setUserId] = useState(payroll?.userId ?? "");
  const [competenceMonth, setCompetenceMonth] = useState(payroll?.competenceMonth ?? todayISO().slice(0, 7));
  const [baseSalary, setBaseSalary] = useState(String(payroll?.baseSalary ?? 0));
  const [benefits, setBenefits] = useState(String(payroll?.benefits ?? 0));
  const [deductions, setDeductions] = useState(String(payroll?.deductions ?? 0));
  const [dueDate, setDueDate] = useState(payroll?.dueDate ?? todayISO());
  const [payAccountId, setPayAccountId] = useState(accounts?.[0]?.id ?? "");
  const [payDate, setPayDate] = useState(todayISO());

  const selectedUser = users?.find((u) => u.id === userId);
  const net = payrollNet({ baseSalary: Number(baseSalary) || 0, benefits: Number(benefits) || 0, deductions: Number(deductions) || 0 } as FinancePayroll);

  async function handleSave() {
    if (!userId) return;
    await createPayroll.mutateAsync({
      userId, competenceMonth, baseSalary: Number(baseSalary) || 0, benefits: Number(benefits) || 0,
      deductions: Number(deductions) || 0, dueDate,
    });
    onClose();
  }

  async function handleMarkPaid() {
    if (!payroll || !payAccountId || !selectedUser) return;
    await markPaid.mutateAsync({
      payroll, accountId: payAccountId, paidDate: payDate,
      responsibleName: selectedUser.shortName, departmentId: selectedUser.departmentId, txns: txns ?? [],
    });
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{payroll ? "Folha" : "Nova folha"}</h3></div>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="pay-user">Colaborador</label>
            <select id="pay-user" className="input" value={userId} onChange={(e) => setUserId(e.target.value)} disabled={!!payroll}>
              <option value="">— Selecione —</option>
              {users?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="pay-competence">Competência</label>
              <input id="pay-competence" type="month" className="input" value={competenceMonth} onChange={(e) => setCompetenceMonth(e.target.value)} disabled={!!payroll} />
            </div>
            <div className="field">
              <label htmlFor="pay-due">Vencimento</label>
              <input id="pay-due" type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!!payroll} />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="pay-base">Salário base</label>
              <input id="pay-base" type="number" step="0.01" className="input" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} disabled={!!payroll} />
            </div>
            <div className="field">
              <label htmlFor="pay-benefits">Benefícios</label>
              <input id="pay-benefits" type="number" step="0.01" className="input" value={benefits} onChange={(e) => setBenefits(e.target.value)} disabled={!!payroll} />
            </div>
            <div className="field">
              <label htmlFor="pay-deductions">Descontos</label>
              <input id="pay-deductions" type="number" step="0.01" className="input" value={deductions} onChange={(e) => setDeductions(e.target.value)} disabled={!!payroll} />
            </div>
          </div>
          <div className="hint">Líquido: <b>{fmtMoney(net)}</b></div>

          {payroll && payroll.status !== "pago" && (
            <div className="hint" style={{ marginTop: 14 }}>
              <div className="section-title" style={{ fontSize: 13 }}>Marcar como pago</div>
              <div className="row">
                <div className="field">
                  <label htmlFor="pay-account">Conta</label>
                  <select id="pay-account" className="input" value={payAccountId} onChange={(e) => setPayAccountId(e.target.value)}>
                    <option value="">— Selecione —</option>
                    {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="pay-date">Data</label>
                  <input id="pay-date" type="date" className="input" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
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
          {!payroll && (
            <button className="btn primary" onClick={handleSave} disabled={createPayroll.isPending || !userId}>
              {createPayroll.isPending ? "Salvando…" : "Salvar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
