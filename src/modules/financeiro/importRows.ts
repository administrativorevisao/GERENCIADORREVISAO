import type { SheetRow } from "../../shared/lib/googleSheets";
import { todayISO } from "../../shared/lib/dates";
import { listRows, removeRow } from "../../shared/lib/jsonStore";
import { STANDARD_DEPARTMENTS } from "../../core/companies/companies";
import type { TeamUser } from "../../core/team/types";
import * as api from "./api";
import type { FinanceAccount, FinViewId } from "./types";
import {
  dreGroupFromCentroCusto, dreGroupFromLabel, isLedgerFormat, parseCompetenceCell, parseDateCell, parseMoneyCell,
} from "./importParsers";

const VIEW_TABLE: Record<FinViewId, string | null> = {
  dashboard: null, dre: null,
  fluxoCaixa: "finance_transactions", contas: "finance_transactions",
  contasBancarias: "finance_accounts", folha: "finance_payroll",
  nfsContratados: "finance_contractor_invoices", faturamento: "finance_invoices", metas: "finance_goals",
};

// Cada sincronização SUBSTITUI os registros que vieram daquela planilha
// (marcados com sourceSheetLinkId) — nunca duplica, mesmo sincronizando
// várias vezes. Registros cadastrados manualmente (sem esse campo) não
// são afetados.
export async function removeFinanceRecordsBySource(companyId: string, view: FinViewId, linkId: string): Promise<void> {
  const table = VIEW_TABLE[view];
  if (!table) return;
  const rows = await listRows<{ id: string; sourceSheetLinkId?: string }>(table, companyId);
  const toRemove = rows.filter((r) => r.sourceSheetLinkId === linkId);
  await Promise.all(toRemove.map((r) => removeRow(table, r.id)));
}

function findUserByNameLoose(users: TeamUser[], name: string): TeamUser | null {
  const s = String(name || "").trim().toLowerCase();
  if (!s) return null;
  return (
    users.find((u) => u.name.trim().toLowerCase() === s) ??
    users.find((u) => u.shortName && u.shortName.trim().toLowerCase() === s) ??
    null
  );
}

// Aplica linhas (SheetRow[], vindas do Sheets ou de um .xlsx) num tipo de
// visão do Financeiro. `extra` é mesclado em cada registro criado — usado
// pra marcar sourceSheetLinkId nos vindos de uma planilha vinculada, pra
// depois poder substituir (nunca duplicar) numa próxima sincronização.
export async function applyFinanceRows(
  companyId: string,
  view: FinViewId,
  rows: SheetRow[],
  users: TeamUser[],
  accounts: FinanceAccount[],
  extra: Record<string, unknown> = {},
): Promise<number> {
  let n = 0;
  const accountsCache = [...accounts];

  async function accountIdByName(name: string): Promise<string | null> {
    if (!name) return null;
    const existing = accountsCache.find((a) => a.name.trim().toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;
    const created = await api.createAccount(companyId, { name });
    accountsCache.push(created);
    return created.id;
  }

  if (view === "fluxoCaixa" || view === "contas") {
    for (const r of rows) {
      const signed = parseMoneyCell(r["Valor"]);
      if (signed == null || signed === 0) continue;
      const amount = Math.abs(signed);
      let type: "receita" | "despesa", status: "pago" | "pendente", accName: string, category: string,
        description: string, due: string, paidDate: string | null, competenceMonth: string, dreGroup: ReturnType<typeof dreGroupFromCentroCusto>;
      if (isLedgerFormat(r)) {
        type = signed < 0 ? "despesa" : "receita";
        const paidRaw = parseDateCell(r["Data de Pagamento"]);
        status = paidRaw ? "pago" : "pendente";
        accName = String(r["Banco"] || "").trim();
        category = String(r["Categoria Revisão"] || r["Categoria (Centro de custo)"] || "").trim();
        description = [r["Descrição"], r["Detalhamento"]].filter(Boolean).join(" — ");
        const comp = parseDateCell(r["Data de Competência"]);
        due = paidRaw || comp || todayISO();
        paidDate = paidRaw;
        competenceMonth = (comp || due).slice(0, 7);
        dreGroup = dreGroupFromCentroCusto(r["Categoria (Centro de custo)"], type === "receita");
      } else {
        const typeRaw = String(r["Tipo"] || "").toLowerCase();
        type = typeRaw ? (/desp|sa[íi]da/.test(typeRaw) ? "despesa" : "receita") : signed < 0 ? "despesa" : "receita";
        const statusRaw = String(r["Status"] || "").toLowerCase();
        status = /pago|paga/.test(statusRaw) ? "pago" : "pendente";
        accName = String(r["Conta"] || "").trim();
        category = String(r["Categoria"] || "");
        description = String(r["Descrição"] || r["Descricao"] || "");
        due = parseDateCell(r["Vencimento"]) || todayISO();
        paidDate = status === "pago" ? parseDateCell(r["Data pagamento"]) || due : null;
        competenceMonth = parseCompetenceCell(r["Competência"] || r["Competencia"]) || due.slice(0, 7);
        dreGroup = dreGroupFromLabel(r["Grupo DRE"]) ?? (type === "receita" ? "receitaBruta" : "despesasOperacionais");
      }
      const accountId = await accountIdByName(accName);
      await api.createTxn(companyId, {
        type, amount, status, accountId, category, description,
        counterparty: String(r["Contraparte"] || ""), dueDate: due, paidDate, competenceMonth, dreGroup,
        ...extra,
      });
      n++;
    }
  } else if (view === "contasBancarias") {
    for (const r of rows) {
      const name = r["Nome"];
      if (!name) continue;
      await api.createAccount(companyId, {
        name: String(name), bank: String(r["Banco"] || ""),
        type: (String(r["Tipo"] || "corrente").trim().toLowerCase() || "corrente") as FinanceAccount["type"],
        openingBalance: parseMoneyCell(r["Saldo inicial"]) ?? 0,
        openingDate: parseDateCell(r["Data abertura"]) || todayISO(),
        ...extra,
      });
      n++;
    }
  } else if (view === "folha") {
    for (const r of rows) {
      const u = findUserByNameLoose(users, r["Colaborador"]);
      const base = parseMoneyCell(r["Salário base"] || r["Salario base"]);
      if (!u || base == null) continue;
      const statusRaw = String(r["Status"] || "").toLowerCase();
      await api.createPayroll(companyId, {
        userId: u.id, competenceMonth: parseCompetenceCell(r["Competência"] || r["Competencia"]) || todayISO().slice(0, 7),
        baseSalary: base, benefits: parseMoneyCell(r["Benefícios"] || r["Beneficios"]) ?? 0,
        deductions: parseMoneyCell(r["Descontos"]) ?? 0, dueDate: parseDateCell(r["Vencimento"]) || todayISO(),
        status: /pago/.test(statusRaw) ? "pago" : "pendente", ...extra,
      });
      n++;
    }
  } else if (view === "nfsContratados") {
    for (const r of rows) {
      const name = r["Colaborador/Contratado"] || r["Contratado"] || r["Nome"];
      const amount = parseMoneyCell(r["Valor"]);
      if (!name || amount == null) continue;
      const u = findUserByNameLoose(users, name);
      const statusRaw = String(r["Status"] || "").toLowerCase();
      await api.createContractorInvoice(companyId, {
        userId: u?.id ?? null, contractorName: u ? "" : String(name),
        nfNumber: String(r["Nº NF"] || r["No NF"] || r["Numero NF"] || ""),
        competenceMonth: parseCompetenceCell(r["Competência"] || r["Competencia"]) || todayISO().slice(0, 7),
        amount, dueDate: parseDateCell(r["Vencimento"]) || todayISO(),
        status: /pago|paga/.test(statusRaw) ? "paga" : "pendente", ...extra,
      });
      n++;
    }
  } else if (view === "faturamento") {
    for (const r of rows) {
      const client = r["Cliente"];
      const amount = parseMoneyCell(r["Valor"]);
      if (!client || amount == null) continue;
      const statusRaw = String(r["Status"] || "").toLowerCase();
      await api.createInvoice(companyId, {
        clientName: String(client), number: String(r["Nº"] || r["No"] || r["Numero"] || ""), amount,
        issueDate: parseDateCell(r["Emissão"] || r["Emissao"]) || todayISO(),
        dueDate: parseDateCell(r["Vencimento"]) || todayISO(),
        status: /pago|paga/.test(statusRaw) ? "paga" : "pendente", ...extra,
      });
      n++;
    }
  } else if (view === "metas") {
    for (const r of rows) {
      const target = parseMoneyCell(r["Valor meta"]);
      const typeRaw = String(r["Tipo"] || "").trim().toLowerCase();
      if (target == null) continue;
      const metricType = typeRaw.startsWith("desp") ? "despesa" : typeRaw.startsWith("luc") ? "lucro" : "receita";
      const dept = STANDARD_DEPARTMENTS.find((d) => d.name.trim().toLowerCase() === String(r["Setor"] || "").trim().toLowerCase());
      await api.createGoal(companyId, {
        metricType, period: parseCompetenceCell(r["Período"] || r["Periodo"]) || todayISO().slice(0, 7),
        targetAmount: target, departmentId: dept?.id ?? null, ...extra,
      });
      n++;
    }
  }
  return n;
}
