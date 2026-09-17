import { useState } from "react";
import { cashPosition, actualFor } from "./api";
import { useAccounts, useGoals, useTxns } from "./useFinance";
import { fmtMoney } from "../../shared/lib/money";
import { todayISO } from "../../shared/lib/dates";
import { DateFilterBar } from "./DateFilterBar";

export function DashboardView() {
  const { data: accounts, isLoading: la } = useAccounts();
  const { data: txns, isLoading: lt } = useTxns();
  const { data: goals, isLoading: lg } = useGoals();
  const [dayFilter, setDayFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  if (la || lt || lg) return <div className="empty">Carregando dashboard…</div>;

  const currentMonth = monthFilter || todayISO().slice(0, 7);
  const asOfDate = dayFilter || todayISO();
  const cash = cashPosition(accounts ?? [], txns ?? [], asOfDate);
  const receita = actualFor(txns ?? [], currentMonth, "receita");
  const despesa = actualFor(txns ?? [], currentMonth, "despesa");
  const lucro = receita - despesa;
  const monthGoals = (goals ?? []).filter((g) => g.period === currentMonth);

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 14 }}>
        <div className="section-title" style={{ margin: 0 }}>Dashboard Financeiro</div>
        <span style={{ flex: 1 }} />
        <DateFilterBar day={dayFilter} month={monthFilter} onDayChange={setDayFilter} onMonthChange={setMonthFilter} dayLabel="Saldo até o dia" monthLabel="Mês de referência" />
      </div>
      <div className="kpis">
        <div className="kpi accent">
          <div className="lab">Saldo em caixa</div>
          <div className="val">{fmtMoney(cash)}</div>
        </div>
        <div className="kpi"><div className="lab">Receita ({currentMonth})</div><div className="val">{fmtMoney(receita)}</div></div>
        <div className="kpi"><div className="lab">Despesa ({currentMonth})</div><div className="val">{fmtMoney(despesa)}</div></div>
        <div className="kpi"><div className="lab">Lucro ({currentMonth})</div><div className="val">{fmtMoney(lucro)}</div></div>
      </div>

      {monthGoals.length > 0 && (
        <div className="card card-pad" style={{ marginTop: 16 }}>
          <div className="section-title">Metas do mês</div>
          {monthGoals.map((goal) => {
            const actual = actualFor(txns ?? [], goal.period, goal.metricType, goal.departmentId);
            const percent = goal.targetAmount > 0 ? Math.round((actual / goal.targetAmount) * 100) : 0;
            return (
              <div key={goal.id} style={{ marginBottom: 10 }}>
                <div className="row" style={{ justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ textTransform: "capitalize" }}>{goal.metricType}</span>
                  <span>{percent}%</span>
                </div>
                <div className="progress"><span style={{ width: `${Math.min(100, percent)}%` }} /></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
