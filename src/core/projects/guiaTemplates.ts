// Modelos de briefing por tipo de curso/edital — espelham os documentos
// reais da operação (Google Docs com guias internas, uma por setor). O
// "tipo de curso" do projeto decide qual conjunto de guias aparece na
// aba Guias do Briefing, na ordem certa.
export type CourseType =
  | "discursiva"
  | "oral"
  | "edital_aberto"
  | "edital_aberto_completo"
  | "pre_edital"
  | "semana_vespera";

export const COURSE_TYPE_LABEL: Record<CourseType, string> = {
  discursiva: "Discursiva (2ª fase)",
  oral: "Oral (prova oral)",
  edital_aberto: "Edital aberto — 1ª e 2ª fase juntas",
  edital_aberto_completo: "Edital aberto — completo (com Simulado Gratuito)",
  pre_edital: "Pré-edital (antes da publicação)",
  semana_vespera: "Semana de véspera (evento gratuito)",
};

export interface GuiaTemplateItem {
  key: string;
  label: string;
  hint: string;
}

const EDITAL: GuiaTemplateItem = { key: "EDITAL", label: "Edital", hint: "Informações gerais do edital, datas, disciplinas, observações." };
const CURSO: GuiaTemplateItem = { key: "CURSO", label: "Curso", hint: "Coordenação, cronogramas, materiais, videoaulas, simulados, legislação local." };
const MARKETING: GuiaTemplateItem = { key: "MARKETING", label: "Marketing", hint: "" };
const COMERCIAL: GuiaTemplateItem = { key: "COMERCIAL", label: "Comercial (+ FAQ)", hint: "Inclua o FAQ de vendas aqui." };
const CS_CX: GuiaTemplateItem = { key: "CS_CX", label: "CS / CX", hint: "" };
const ADM_FINANCEIRO: GuiaTemplateItem = { key: "ADM_FINANCEIRO", label: "ADM / Financeiro", hint: "" };
const PEDAGOGICO: GuiaTemplateItem = { key: "PEDAGOGICO", label: "Pedagógico", hint: "" };

export const GUIA_TEMPLATES: Record<CourseType, GuiaTemplateItem[]> = {
  discursiva: [EDITAL, CURSO, MARKETING, COMERCIAL, CS_CX, ADM_FINANCEIRO, PEDAGOGICO],
  oral: [
    { key: "ANALISE_EDITAL", label: "Análise do Edital", hint: "Anamnese do concurso, datas, conteúdo programático da P3." },
    { key: "CURSO", label: "Curso", hint: "Programação presencial." },
    MARKETING,
    COMERCIAL,
    { key: "CS_CX", label: "CS / CX", hint: "Checklist, listagens, fechamentos." },
    PEDAGOGICO,
    { key: "ADM_FINANCEIRO", label: "ADM / Financeiro", hint: "Logística presencial: passagens, hotel, reembolso, pagamento de professor." },
  ],
  edital_aberto: [EDITAL, CURSO, MARKETING, COMERCIAL, CS_CX, ADM_FINANCEIRO, PEDAGOGICO],
  edital_aberto_completo: [
    EDITAL, CURSO, MARKETING, COMERCIAL, CS_CX, ADM_FINANCEIRO, PEDAGOGICO,
    { key: "SIMULADO_GRATUITO", label: "Simulado Gratuito", hint: "Simulados gratuitos — não ficam mais na página de vendas." },
  ],
  pre_edital: [
    { key: "ULTIMO_EDITAL", label: "Último Edital", hint: "Referência ao edital anterior — o novo ainda não saiu." },
    CURSO, MARKETING, COMERCIAL, CS_CX, ADM_FINANCEIRO, PEDAGOGICO,
  ],
  semana_vespera: [
    { key: "EVENTO", label: "Evento", hint: "Dados do evento, programação completa (dia/hora/disciplina/professor), links importantes." },
    MARKETING,
    { key: "COMERCIAL", label: "Comercial", hint: "Lista de inscritos." },
    { key: "CS_CX", label: "CS / CX", hint: "Fluxo de mensagens." },
    PEDAGOGICO,
    { key: "ADM_FINANCEIRO", label: "Administrativo / Financeiro", hint: "" },
  ],
};

export interface GuiaContent {
  key: string;
  content: string;
}

export interface ScheduledMessage {
  id: string;
  label: string;
  date: string;
  status: "enviado" | "programar";
}

export interface SectorLink {
  id: string;
  departmentId: string;
  label: string;
  url: string;
}
