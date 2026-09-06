import * as XLSX from "xlsx";

export function downloadTeamTemplate() {
  const cols = {
    Nome: "Maria Silva",
    "Nome curto": "Maria",
    "E-mail": "maria@empresa.com.br",
    Cargo: "Analista Pedagógico",
    Setor: "Pedagógico / Comercial / Marketing / Financeiro / Administrativo / CS / CX / Diretoria",
    Papel: "Colaborador ou Admin",
    "Data de nascimento": "1995-03-20",
  };
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([cols]);
  XLSX.utils.book_append_sheet(wb, ws, "Equipe");
  XLSX.writeFile(wb, "modelo_equipe.xlsx");
}
