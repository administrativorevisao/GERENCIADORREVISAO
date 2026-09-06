import * as XLSX from "xlsx";
import type { FinViewId } from "./types";

interface FinTemplate {
  sheet: string;
  cols: Record<string, string>;
}

export const FIN_TEMPLATES: Partial<Record<FinViewId, FinTemplate>> = {
  fluxoCaixa: {
    sheet: "Lançamentos",
    cols: {
      Tipo: "Receita ou Despesa", Categoria: "Ex: Aluguel", Conta: "Nome da conta bancária (cadastrada)",
      Contraparte: "Cliente/Fornecedor", Descrição: "", Competência: "2026-08", Vencimento: "2026-08-10",
      "Data pagamento": "2026-08-10 (deixe vazio se pendente)", Status: "Pago ou Pendente", Valor: "1234.56",
      "Grupo DRE": "Receita Bruta / Deduções / Custos / Despesas Operacionais",
    },
  },
  contasBancarias: {
    sheet: "Contas",
    cols: { Nome: "Conta Corrente Itaú", Banco: "Itaú", Tipo: "corrente / poupanca / caixa / investimento", "Saldo inicial": "10000.00", "Data abertura": "2026-01-01" },
  },
  folha: {
    sheet: "Folha",
    cols: { Colaborador: "Nome exatamente como cadastrado em Equipe", Competência: "2026-08", "Salário base": "3000.00", Benefícios: "300.00", Descontos: "150.00", Vencimento: "2026-08-05", Status: "Pago ou Pendente" },
  },
  nfsContratados: {
    sheet: "NFs",
    cols: { "Colaborador/Contratado": "Nome", "Nº NF": "123", Competência: "2026-08", Valor: "1500.00", Vencimento: "2026-08-10", Status: "Pago ou Pendente" },
  },
  faturamento: {
    sheet: "Faturamento",
    cols: { Cliente: "Cliente Teste LTDA", "Nº": "NF-001", Valor: "5000.00", Emissão: "2026-08-01", Vencimento: "2026-08-10", Status: "Paga ou Pendente" },
  },
  metas: {
    sheet: "Metas",
    cols: { Tipo: "Receita / Despesa / Lucro", Período: "2026-08", "Valor meta": "40000.00", Setor: "(opcional) nome do setor" },
  },
};

export function downloadFinanceTemplate(view: FinViewId) {
  const t = FIN_TEMPLATES[view];
  if (!t) return;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([t.cols]);
  XLSX.utils.book_append_sheet(wb, ws, t.sheet.slice(0, 31));
  XLSX.writeFile(wb, `modelo_${view}.xlsx`);
}
