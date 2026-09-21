import { useState } from "react";
import { STANDARD_DEPARTMENTS } from "../../core/companies/companies";
import { userName, useUsers } from "../../core/team/useUsers";
import { fmtMoney } from "../../shared/lib/money";
import { payrollNet } from "./api";
import { usePayroll } from "./useFinance";
import type { FinancePayroll } from "./types";
import { PayrollModal } from "./PayrollModal";
import { SheetSyncPanel } from "./SheetSyncPanel";
import { DateFilterBar } from "./DateFilterBar";

export function FolhaView() {
  const { data: payroll, isLoading } = usePayroll();
  const { data: users } = useUsers();
  const [editing, setEditing] = useState<FinancePayroll | null | "new">(null);
  const [dayFilter, setDayFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");

  if (isLoading) return <div className="empty">Carregando folha…</div>;

  const all = payroll ?? [];
  const allUsers = users ?? [];
  const years = Array.from(new Set(all.map((p) => p.competenceMonth.slice(0, 4)))).sort().reverse();
  const employees = allUsers
    .filter((u) => all.some((p) => p.userId === u.id))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const list = all
    .filter((p) => !dayFilter || p.dueDate === dayFilter)
    .filter((p) => !monthFilter || p.competenceMonth === monthFilter)
    .filter((p) => !yearFilter || p.competenceMonth.startsWith(yearFilter))
    .filter((p) => !deptFilter || allUsers.find((u) => u.id === p.userId)?.departmentId === deptFilter)
    .filter((p) => !userFilter || p.userId === userFilter)
    .slice()
    .sort((a, b) => b.competenceMonth.localeCompare(a.competenceMonth));

  return (
    <div>
      <SheetSyncPanel view="folha" />
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>Folha de Pagamento <span className="count">{list.length}</span></div>
        <span style={{ flex: 1 }} />
        <select className="input" style={{ width: "auto" }} value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
          <option value="">Ano: todos</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <DateFilterBar day={dayFilter} month={monthFilter} onDayChange={setDayFilter} onMonthChange={setMonthFilter} dayLabel="Vencimento" monthLabel="Competência" />
        <select className="input" style={{ width: "auto" }} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="">Setor: todos</option>
          {STANDARD_DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="input" style={{ width: "auto" }} value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
          <option value="">Funcionário: todos</option>
          {employees.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <button className="btn primary sm" onClick={() => setEditing("new")}>+ Nova folha</button>
      </div>
      {list.length === 0 && <div className="empty">Nenhum registro de folha ainda.</div>}
      {list.length > 0 && (
        <div className="tbl-wrap">
          <table className="data">
            <thead><tr><th>Colaborador</th><th>Setor</th><th>Competência</th><th>Líquido</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((p) => {
                const dept = STANDARD_DEPARTMENTS.find((d) => d.id === allUsers.find((u) => u.id === p.userId)?.departmentId);
                return (
                  <tr key={p.id} onClick={() => setEditing(p)} style={{ cursor: "pointer" }}>
                    <td>{userName(users, p.userId)}</td>
                    <td>{dept ? `${dept.icon} ${dept.name}` : "—"}</td>
                    <td>{p.competenceMonth}</td>
                    <td>{fmtMoney(payrollNet(p))}</td>
                    <td><span className={`badge ${p.status === "pago" ? "b-done" : "b-soft"}`}>{p.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {editing && <PayrollModal payroll={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
