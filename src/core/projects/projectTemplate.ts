import * as XLSX from "xlsx";
import { COURSE_TYPE_LABEL } from "./guiaTemplates";
import { PROJECT_STATUS_LABEL } from "./types";

export function downloadProjectTemplate() {
  const cols = {
    Nome: "OAB 1ª Fase - Set/2026",
    Descrição: "Curso preparatório para a 1ª fase da OAB",
    Programa: "(opcional) nome de um programa já cadastrado",
    "Tipo de curso": Object.values(COURSE_TYPE_LABEL).join(" / "),
    Início: "2026-09-01",
    Prazo: "2026-11-30",
    Responsável: "Nome ou e-mail de alguém já cadastrado em Equipe",
    Prioridade: "Alta / Média / Baixa",
    Status: Object.values(PROJECT_STATUS_LABEL).join(" / "),
  };
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([cols]);
  XLSX.utils.book_append_sheet(wb, ws, "Projetos");
  XLSX.writeFile(wb, "modelo_projetos.xlsx");
}
