import type { CourseType, GuiaContent, ScheduledMessage, SectorLink } from "./guiaTemplates";

export type ProjectStatus = "planning" | "active" | "hold" | "done" | "cancelled";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planejamento",
  active: "Em andamento",
  hold: "Em espera",
  done: "Concluído",
  cancelled: "Cancelado",
};

export interface KeyDate {
  id: string;
  label: string;
  date: string;
}

export interface Briefing {
  content: string;
  keyDates: KeyDate[];
  updatedAt: string | null;
  updatedBy: string | null;
}

// Detalhes do curso/edital do projeto — o "documento único" que centraliza
// as informações que todos os setores consultam (pedagógico, comercial,
// marketing, CS…). Espelha defaultCourse()/EDITAL_FIELDS do app original.
// Uma data do Cronograma completo do curso — sincronizada como evento de
// dia inteiro na Agenda Google fixa (ver shared/lib/googleCalendar.ts).
// googleEventId fica null até a primeira sincronização; depois disso,
// reaproveitado pra ATUALIZAR o mesmo evento em vez de duplicar.
export interface CronogramaItem {
  id: string;
  label: string;
  date: string; // "YYYY-MM-DD"
  googleEventId: string | null;
}

// Modalidade do curso — lista fechada, só dá pra escolher uma destas.
export type Modalidade =
  | "objetiva"
  | "discursiva_com_sem_correcao"
  | "objetiva_discursiva_com_sem_correcao"
  | "objetiva_discursiva_sem_correcao"
  | "pacote_especial"
  | "prova_oral_online"
  | "prova_oral_online_presencial"
  | "semana_vespera";

export const MODALIDADE_LABEL: Record<Modalidade, string> = {
  objetiva: "Objetiva",
  discursiva_com_sem_correcao: "Discursiva com/sem correção",
  objetiva_discursiva_com_sem_correcao: "Objetiva+Discursiva com/sem correção",
  objetiva_discursiva_sem_correcao: "Objetiva+Discursiva sem correção",
  pacote_especial: "Pacote Especial",
  prova_oral_online: "Prova Oral Online",
  prova_oral_online_presencial: "Prova Oral Online+Presencial",
  semana_vespera: "Semana de Véspera",
};

// Só estas modalidades têm a "Estrutura do curso" (Coordenação/Cronograma/
// Materiais) — Pacote Especial, Prova Oral e Semana de Véspera não têm.
export const MODALIDADES_COM_ESTRUTURA: Modalidade[] = [
  "objetiva", "discursiva_com_sem_correcao", "objetiva_discursiva_com_sem_correcao", "objetiva_discursiva_sem_correcao",
];
// Só estas permitem dois preços (com/sem correção) na Oferta.
export const MODALIDADES_PRECO_DUPLO: Modalidade[] = [
  "discursiva_com_sem_correcao", "objetiva_discursiva_com_sem_correcao", "objetiva_discursiva_sem_correcao",
];

export type TipoCronograma = "light" | "hard";
export const TIPO_CRONOGRAMA_LABEL: Record<TipoCronograma, string> = {
  light: "Cronograma Light — em média 3/4h por dia (≈80 páginas de leitura por dia)",
  hard: "Cronograma Hard — em média 6h por dia (PDFULL de temas importantes, metas extras de legislação geral/local, questões, informativos de jurisprudência...)",
};

export interface Coordenacao {
  coordenador: string;
  encontroInicioData: string | null; // obrigatório antes de considerar completo, mas fica null até preencher
  encontroInicioEventId: string | null; // evento na Agenda Google (ver googleCalendar.ts)
}
export const emptyCoordenacao: Coordenacao = { coordenador: "", encontroInicioData: null, encontroInicioEventId: null };

export interface CronogramaEstrutura {
  tipos: TipoCronograma[]; // múltipla escolha
  dataInicio: string | null;
  dataInicioEventId: string | null;
  // duração em semanas é CALCULADA (dataProvaChave − dataInicio), nunca guardada
}
export const emptyCronogramaEstrutura: CronogramaEstrutura = { tipos: [], dataInicio: null, dataInicioEventId: null };

export type PdfOpcao = "pdfight" | "pdfull" | "pdflash" | "jurisprudencia" | "caderno_mensal";
export const PDF_OPCAO_LABEL: Record<PdfOpcao, string> = {
  pdfight: "Todos os PDFIGHT's relacionados às matérias previstas no conteúdo programático",
  pdfull: "PDFULL's específicos (nunca todos), conforme importância e complexidade do tema",
  pdflash: "PDFLASH's",
  jurisprudencia: "Indicação de leitura de Jurisprudência, quando pertinente",
  caderno_mensal: "Caderno de Jurisprudência mensal",
};

export interface MateriaisEstrutura {
  materias: string;
  pdfs: PdfOpcao[]; // múltipla escolha
}
export const emptyMateriaisEstrutura: MateriaisEstrutura = { materias: "", pdfs: [] };

// Um item de "sim/não + lista" da aba Legislação Local.
export interface SimNaoLista {
  ativo: boolean;
  lista: string;
}
const emptySimNaoLista: SimNaoLista = { ativo: false, lista: "" };

export interface LegislacaoLocalEstrutura {
  // "Toda a legislação local elencada no edital, em formato de legproc,
  // grifada e com acréscimo de comentários, quando necessário."
  legproc: SimNaoLista;
  // "Teremos Lei Local grifada ('LegProc's Locais')"
  leiLocalGrifada: SimNaoLista;
  // "Flashcards das principais leis locais (a critério do coordenador)"
  flashcards: SimNaoLista;
  // "Material com a indicação dos principais artigos por lei (a critério do coordenador)"
  principaisArtigos: SimNaoLista;
  // "Material de legislação local em frases (a critério do coordenador)"
  legislacaoEmFrases: SimNaoLista;
  // "Videoaulas com Professores Procuradores abordando Legislação local e
  // Jurisprudência Local (quando pertinente) (a critério do coordenador)"
  videoaulas: SimNaoLista;
  dataInicioParteLocal: string | null;
  dataInicioParteLocalEventId: string | null;
}
export const emptyLegislacaoLocalEstrutura: LegislacaoLocalEstrutura = {
  legproc: { ...emptySimNaoLista }, leiLocalGrifada: { ...emptySimNaoLista }, flashcards: { ...emptySimNaoLista },
  principaisArtigos: { ...emptySimNaoLista }, legislacaoEmFrases: { ...emptySimNaoLista }, videoaulas: { ...emptySimNaoLista },
  dataInicioParteLocal: null, dataInicioParteLocalEventId: null,
};

export interface EstruturaCurso {
  coordenacao: Coordenacao;
  cronograma: CronogramaEstrutura;
  materiais: MateriaisEstrutura;
  legislacaoLocal: LegislacaoLocalEstrutura;
}
export const emptyEstruturaCurso: EstruturaCurso = {
  coordenacao: { ...emptyCoordenacao }, cronograma: { ...emptyCronogramaEstrutura },
  materiais: { ...emptyMateriaisEstrutura }, legislacaoLocal: { ...emptyLegislacaoLocalEstrutura },
};

// Ancoragem/À vista/Parcelamento — texto livre (ex: "R$ 1.997,00", "12x sem juros"),
// igual sempre foi preço nesse sistema.
export interface PrecoSet {
  ancoragem: string;
  aVista: string;
  parcelamento: string;
}
const emptyPrecoSet: PrecoSet = { ancoragem: "", aVista: "", parcelamento: "" };

export interface Oferta {
  // usado quando a modalidade NÃO tem preço duplo
  preco: PrecoSet;
  // usados só quando a modalidade tem preço duplo (MODALIDADES_PRECO_DUPLO)
  precoComCorrecao: PrecoSet;
  precoSemCorrecao: PrecoSet;
}
export const emptyOferta: Oferta = { preco: { ...emptyPrecoSet }, precoComCorrecao: { ...emptyPrecoSet }, precoSemCorrecao: { ...emptyPrecoSet } };

export interface Course {
  orgaoEstado: string;
  cargoCarreira: string;
  vagas: string;
  remuneracao: string;
  banca: string;
  linkConcurso: string;
  analiseEdital: string;
  disciplinas: string;
  cronogramaCompleto: CronogramaItem[];
  // Data-chave do concurso (dia da prova) — usada em cascata por vários
  // cálculos (tempo de acesso, duração do cronograma) e dispara sozinha uma
  // tarefa pro Financeiro fechar este projeto (ver ProjectDetailPage.tsx).
  dataProvaChave: string | null;
  provaChaveTaskId: string | null;
  observacoes: string;
  modalidades: Modalidade | "";
  inicioVendas: string; // data (YYYY-MM-DD)
  // Sempre CALCULADO (dataProvaChave + 15 dias) — não é mais editável.
  tempoAcesso: string;
  estruturaCurso: EstruturaCurso;
  condicoesComercialCs: string;
  oferta: Oferta;
}

export const emptyCourse: Course = {
  orgaoEstado: "", cargoCarreira: "", vagas: "", remuneracao: "", banca: "", linkConcurso: "",
  analiseEdital: "", disciplinas: "", cronogramaCompleto: [], dataProvaChave: null, provaChaveTaskId: null,
  observacoes: "", modalidades: "", inicioVendas: "", tempoAcesso: "",
  estruturaCurso: { ...emptyEstruturaCurso }, condicoesComercialCs: "", oferta: { ...emptyOferta },
};

export function courseHasData(course: Course): boolean {
  return Object.entries(course).some(([key, v]) => {
    if (key === "cronogramaCompleto") return (v as CronogramaItem[]).length > 0;
    if (key === "estruturaCurso" || key === "oferta" || key === "dataProvaChave" || key === "provaChaveTaskId") return Boolean(v) && !(Array.isArray(v) && v.length === 0);
    return typeof v === "string" && v.trim();
  });
}

export interface Project {
  id: string;
  name: string;
  description: string;
  iconImage: string | null;
  programId: string | null;
  subProgramId: string | null;
  ownerId: string | null;
  startDate: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  status: ProjectStatus;
  briefing: Briefing;
  course: Course;
  courseType: CourseType | null;
  guias: GuiaContent[];
  scheduledMessages: ScheduledMessage[];
  sectorLinks: SectorLink[];
  documents: ProjectDocument[];
}

// Arquivo anexado ao projeto (Doc, PDF, planilha, o que for) — guarda só o
// link do Drive, sem extrair conteúdo. Diferente de Briefing.content
// (texto puro colado/importado) — isso é o arquivo original em si.
export interface ProjectDocument {
  id: string;
  name: string;
  url: string;
  addedAt: string;
}

export const PROGRAM_COLORS = [
  "#6d28d9", "#dc2626", "#d97706", "#2563eb", "#0891b2",
  "#059669", "#db2777", "#65a30d", "#4f46e5", "#0d9488",
];

export interface Program {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconImage: string | null;
  color: string;
  departmentId: string | null;
  ownerId: string | null;
  subPrograms: SubProgram[];
}

// Agrupamento dentro de um programa — ex: dentro do programa "Perpétuo",
// cada concurso (PGE/AC, PGM Rio de Janeiro...) é um subprograma que junta
// os vários projetos/sprints daquele mesmo concurso.
export interface SubProgram {
  id: string;
  name: string;
}
