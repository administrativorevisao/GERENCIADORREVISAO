import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext";
import { isAdmin } from "../../shared/auth/types";
import { safeHref } from "../../shared/lib/safeUrl";
import { useCreateTask, useTasks, useUpdateTask } from "../tasks/useTasks";
import { userName, useUsers } from "../team/useUsers";
import { useProjects, useUpdateProject } from "./useProjects";
import {
  emptyCourse, MODALIDADE_LABEL, MODALIDADES_COM_ESTRUTURA, MODALIDADES_PRECO_DUPLO, PDF_OPCAO_LABEL,
  PROJECT_STATUS_LABEL, TIPO_CRONOGRAMA_LABEL,
  type Coordenacao, type Course, type CronogramaEstrutura, type CronogramaItem, type EstruturaCurso,
  type KeyDate, type LegislacaoLocalEstrutura, type MateriaisEstrutura, type Modalidade, type Oferta,
  type PdfOpcao, type PrecoSet, type Project, type ProjectDocument, type ProjectStatus, type SimNaoLista, type TipoCronograma,
} from "./types";
import { COURSE_TYPE_LABEL, GUIA_TEMPLATES, type CourseType, type GuiaContent, type ScheduledMessage, type SectorLink } from "./guiaTemplates";
import { STANDARD_DEPARTMENTS } from "../companies/companies";
import { STATUS_LABEL } from "../tasks/types";
import { addDaysISO, dueStatus, fmtDate, todayISO } from "../../shared/lib/dates";
import { newId } from "../../shared/lib/jsonStore";
import { useGoogleImport } from "../../shared/lib/useGoogleImport";
import { pickFile, resizeImageToDataURL } from "../../shared/lib/imageUpload";

type Tab = "briefing" | "edital" | "course" | "guias" | "dates" | "links" | "documents" | "tasks";
const TABS: { id: Tab; label: string }[] = [
  { id: "briefing", label: "Briefing" },
  { id: "edital", label: "Concurso" },
  { id: "course", label: "Curso" },
  { id: "guias", label: "Guias por setor" },
  { id: "dates", label: "Datas-chave" },
  { id: "links", label: "Links" },
  { id: "documents", label: "Documentos" },
  { id: "tasks", label: "Tarefas" },
];

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { data: projects, isLoading } = useProjects();
  const { data: tasks } = useTasks();
  const { data: users } = useUsers();
  const updateProject = useUpdateProject();
  const [tab, setTab] = useState<Tab>("briefing");
  const [copied, setCopied] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const admin = isAdmin(profile);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível (ex: navegador sem permissão) — sem feedback de erro,
      // o link continua visível na barra de endereço pra copiar manualmente.
    }
  }

  async function handlePickImage(current: Project) {
    setImageError(null);
    const file = await pickFile("image/jpeg,image/png,image/jpg,image/webp");
    if (!file) return;
    setUploadingImage(true);
    try {
      const dataUrl = await resizeImageToDataURL(file, 480);
      await updateProject.mutateAsync({ ...current, iconImage: dataUrl });
    } catch (e) {
      setImageError((e as Error).message || "Não foi possível processar a imagem.");
    } finally {
      setUploadingImage(false);
    }
  }

  if (isLoading) return <div className="empty">Carregando…</div>;

  const project = projects?.find((p) => p.id === id);
  if (!project) {
    return (
      <div className="empty">
        <div className="big msi">search_off</div>
        Projeto não encontrado.
        <div><Link to="/projetos">Voltar para Projetos</Link></div>
      </div>
    );
  }

  const projectTasks = (tasks ?? []).filter((t) => t.projectId === project.id);

  return (
    <div>
      <Link to="/projetos" className="muted" style={{ fontSize: 12.5 }}>← Projetos</Link>
      <div className="row" style={{ alignItems: "center", gap: 12, margin: "10px 0 18px" }}>
        {project.iconImage ? (
          <img
            src={project.iconImage} alt=""
            style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", flex: "none" }}
          />
        ) : admin ? (
          <button
            className="btn sm ghost" style={{ width: 56, height: 56, flex: "none", flexDirection: "column", gap: 2, fontSize: 10 }}
            onClick={() => handlePickImage(project)} disabled={uploadingImage}
          >
            <span className="msi" style={{ fontSize: 18 }}>add_photo_alternate</span>
            {uploadingImage ? "..." : "Imagem"}
          </button>
        ) : null}
        <div className="stack">
          <b style={{ fontSize: 20 }}>{project.name}</b>
          <span className="muted" style={{ fontSize: 13 }}>{project.description || "Sem descrição"}</span>
          {imageError && <span className="hint" style={{ color: "var(--danger, #d33)" }}>{imageError}</span>}
        </div>
        {admin && project.iconImage && (
          <div className="row" style={{ gap: 6, flex: "none" }}>
            <button className="btn sm ghost" onClick={() => handlePickImage(project)} disabled={uploadingImage}>
              {uploadingImage ? "Enviando…" : "Trocar imagem"}
            </button>
            <button className="btn sm ghost" onClick={() => updateProject.mutate({ ...project, iconImage: null })}>
              Remover imagem
            </button>
          </div>
        )}
        <button
          className="btn sm ghost"
          style={{ marginLeft: "auto" }}
          onClick={handleShare}
        >
          <span className="msi">{copied ? "check" : "link"}</span> {copied ? "Link copiado!" : "Copiar link"}
        </button>
        {admin ? (
          <select
            className="input" style={{ width: "auto", padding: "6px 10px", fontSize: 12.5 }}
            value={project.status}
            onChange={(e) => updateProject.mutate({ ...project, status: e.target.value as ProjectStatus })}
          >
            {Object.entries(PROJECT_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        ) : (
          <span className="badge b-soft">{PROJECT_STATUS_LABEL[project.status]}</span>
        )}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", gap: 16, alignItems: "start" }}>
        <div className="card card-pad">
          <div className="seg" style={{ marginBottom: 16 }}>
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>
          {tab === "briefing" && <BriefingTab project={project} />}
          {tab === "edital" && <CourseTab project={project} groupKey="edital" />}
          {tab === "course" && <CourseTab project={project} groupKey="course" />}
          {tab === "guias" && <GuiasTab project={project} />}
          {tab === "dates" && <KeyDatesTab project={project} />}
          {tab === "links" && <LinksTab project={project} />}
          {tab === "documents" && <DocumentsTab project={project} />}
          {tab === "tasks" && <TasksTab tasks={projectTasks} users={users} />}
        </div>

        <div className="card card-pad">
          <div className="section-title">Detalhes</div>
          <div className="field"><label>Início</label>{fmtDate(project.startDate)}</div>
          <div className="field"><label>Prazo</label>{fmtDate(project.dueDate)}</div>
          <div className="field"><label>Responsável</label>{userName(users, project.ownerId)}</div>
        </div>
      </div>
    </div>
  );
}

function BriefingTab({ project }: { project: Project }) {
  const { profile } = useAuth();
  const updateProject = useUpdateProject();
  const { pickDocument, docTextFromId, extractFileId } = useGoogleImport();
  const [draft, setDraft] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const text = draft ?? project.briefing.content;
  const changed = draft !== null && draft !== project.briefing.content;

  async function save() {
    await updateProject.mutateAsync({
      ...project,
      briefing: { ...project.briefing, content: text, updatedAt: new Date().toISOString(), updatedBy: profile?.id ?? null },
    });
    setDraft(null);
  }

  async function importFromDoc() {
    setImportError(null);
    setImporting(true);
    try {
      const picked = await pickDocument();
      if (!picked) return;
      const fileId = extractFileId(picked.url) ?? picked.id;
      const docText = await docTextFromId(fileId);
      setDraft(docText);
    } catch (e) {
      setImportError((e as Error).message || "Não foi possível importar o documento.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
        Documento central deste curso/projeto — contexto, objetivos e o que cada setor precisa saber. As datas
        que orientam todos os setores ficam na aba <b>Datas-chave</b>, e os dados do edital/curso na aba <b>Curso / Edital</b>.
      </p>
      <div className="row" style={{ marginBottom: 8 }}>
        <button className="btn sm ghost" onClick={importFromDoc} disabled={importing}>
          <span className="msi">folder_open</span> {importing ? "Abrindo o Drive…" : "Importar do Google Doc"}
        </button>
      </div>
      {importError && <p className="hint" style={{ color: "var(--danger, #d33)" }}>{importError}</p>}
      <textarea
        className="input"
        style={{ minHeight: 220 }}
        value={text}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Contexto, objetivos e informações-chave do projeto para os setores envolvidos."
      />
      {changed && (
        <button className="btn primary sm" style={{ marginTop: 10 }} onClick={save} disabled={updateProject.isPending}>
          {updateProject.isPending ? "Salvando…" : "Salvar briefing"}
        </button>
      )}
      {project.briefing.updatedAt && (
        <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>Atualizado em {fmtDate(project.briefing.updatedAt.slice(0, 10))}</p>
      )}
    </div>
  );
}

const COURSE_FIELD_GROUPS: Record<"edital" | "course", { title: string; intro: string; fields: { key: keyof Course; label: string }[] }> = {
  edital: {
    title: "Concurso",
    intro: "Informações gerais do concurso — a fonte única para todos os setores não ficarem se perguntando.",
    fields: [
      { key: "orgaoEstado", label: "Órgão / Estado" },
      { key: "cargoCarreira", label: "Cargo / Carreira" },
      { key: "vagas", label: "Vagas" },
      { key: "remuneracao", label: "Remuneração" },
      { key: "banca", label: "Banca" },
      { key: "linkConcurso", label: "Link do concurso" },
      { key: "disciplinas", label: "Disciplinas" },
      { key: "analiseEdital", label: "Análise do edital" },
      { key: "dataProvaChave", label: "Data da prova chave" },
      { key: "cronogramaCompleto", label: "Cronograma completo do curso" },
    ],
  },
  course: {
    title: "Curso",
    intro: "Dados comerciais/operacionais do curso — modalidade, vendas, estrutura e oferta.",
    fields: [
      { key: "modalidades", label: "Modalidades" },
      { key: "inicioVendas", label: "Início das vendas" },
      { key: "tempoAcesso", label: "Tempo de acesso (sempre 15 dias após a data da prova)" },
      { key: "condicoesComercialCs", label: "Condições comercial/CS" },
    ],
  },
};
const LONG_FIELDS = new Set<keyof Course>(["observacoes", "disciplinas"]);
// Campos que guardam um link (não texto) — renderizados com um "Abrir ↗"
// clicável ao lado do rótulo, em vez de exigir copiar/colar o valor pra
// abrir no navegador.
const URL_FIELDS = new Set<keyof Course>(["linkConcurso", "analiseEdital"]);
const DATE_FIELDS = new Set<keyof Course>(["dataProvaChave", "inicioVendas"]);
// Não são mais campos de texto — renderizados à parte (custom UI).
const FIELDS_WITH_CUSTOM_UI = new Set<keyof Course>(["cronogramaCompleto", "modalidades", "tempoAcesso"]);

function CourseTab({ project, groupKey }: { project: Project; groupKey: "edital" | "course" }) {
  const updateProject = useUpdateProject();
  const { data: tasks } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { pickDocument, docTextFromId, extractFileId } = useGoogleImport();
  const [draft, setDraft] = useState<Course | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const course = draft ?? project.course ?? emptyCourse;
  const changed = draft !== null;
  const group = COURSE_FIELD_GROUPS[groupKey];
  const longFieldsInGroup = group.fields.filter((f) => LONG_FIELDS.has(f.key));
  const [importTarget, setImportTarget] = useState<keyof Course>(() => longFieldsInGroup[0]?.key ?? "disciplinas");

  function setField(key: keyof Course, value: string) {
    setDraft({ ...course, [key]: value });
  }

  // Data da prova chave gera (ou atualiza) sozinha uma tarefa pro Financeiro
  // fechar este projeto — sem precisar ninguém lembrar de criar na mão.
  async function syncProvaChaveTask(next: Course): Promise<Course> {
    if (!next.dataProvaChave) return next;
    const existing = next.provaChaveTaskId ? (tasks ?? []).find((t) => t.id === next.provaChaveTaskId) : null;
    const title = `Fechar curso — ${project.name}`;
    if (existing) {
      await updateTask.mutateAsync({ ...existing, title, dueDate: next.dataProvaChave, projectId: project.id });
      return next;
    }
    const created = await createTask.mutateAsync({
      title, description: `Fechamento financeiro do projeto "${project.name}" — gerada automaticamente pela Data da prova chave.`,
      type: "project", departmentId: "dep_fin", responsibleId: null, projectId: project.id,
      scheduledDate: next.dataProvaChave, dueDate: next.dataProvaChave,
    });
    return { ...next, provaChaveTaskId: created.id };
  }

  async function save() {
    const prevProvaChave = project.course?.dataProvaChave ?? null;
    let next = course;
    if (groupKey === "edital" && next.dataProvaChave !== prevProvaChave) {
      next = await syncProvaChaveTask(next);
    }
    await updateProject.mutateAsync({ ...project, course: next });
    setDraft(null);
  }

  async function importDocument() {
    setImportError(null);
    setImporting(true);
    try {
      const picked = await pickDocument();
      if (!picked) return;
      const fileId = extractFileId(picked.url) ?? picked.id;
      const text = await docTextFromId(fileId);
      setField(importTarget, text);
    } catch (e) {
      setImportError((e as Error).message || "Não foi possível importar o documento.");
    } finally {
      setImporting(false);
    }
  }

  const tempoAcessoComputed = course.dataProvaChave ? addDaysISO(course.dataProvaChave, 15) : null;

  return (
    <div>
      <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>{group.intro}</p>
      {longFieldsInGroup.length > 0 && (
        <div className="row" style={{ marginBottom: 12, flexWrap: "wrap" }}>
          <button className="btn sm ghost" onClick={importDocument} disabled={importing}>
            <span className="msi">folder_open</span> {importing ? "Abrindo o Drive…" : "Importar do Google Doc"}
          </button>
          <span className="muted" style={{ fontSize: 12 }}>para</span>
          <select
            className="input" style={{ width: "auto", padding: "4px 8px", fontSize: 12.5 }}
            value={importTarget}
            onChange={(e) => setImportTarget(e.target.value as keyof Course)}
          >
            {longFieldsInGroup.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>
      )}
      {importError && <p className="hint" style={{ color: "var(--danger, #d33)" }}>{importError}</p>}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {group.fields.filter((f) => !FIELDS_WITH_CUSTOM_UI.has(f.key)).map((f) => {
          const value = course[f.key] as string;
          const isUrl = URL_FIELDS.has(f.key);
          const isDate = DATE_FIELDS.has(f.key);
          return (
            <div className="field" key={f.key} style={{ margin: 0 }}>
              <label htmlFor={`course-${f.key}`}>
                {f.label}
                {isUrl && value.trim() && (
                  <a href={safeHref(value)} target="_blank" rel="noreferrer" style={{ marginLeft: 8, fontWeight: 400, fontSize: 11.5 }}>
                    <span className="msi" style={{ fontSize: 13, verticalAlign: "middle" }}>open_in_new</span> Abrir
                  </a>
                )}
              </label>
              {LONG_FIELDS.has(f.key) ? (
                <textarea id={`course-${f.key}`} className="input" value={value} onChange={(e) => setField(f.key, e.target.value)} />
              ) : (
                <input
                  id={`course-${f.key}`} className="input" type={isDate ? "date" : isUrl ? "url" : "text"}
                  placeholder={isUrl ? "https://..." : undefined}
                  value={value ?? ""} onChange={(e) => setField(f.key, e.target.value)}
                />
              )}
            </div>
          );
        })}
        {group.fields.some((f) => f.key === "modalidades") && (
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="course-modalidades">Modalidades</label>
            <select
              id="course-modalidades" className="input" value={course.modalidades}
              onChange={(e) => setField("modalidades", e.target.value)}
            >
              <option value="">— Escolha —</option>
              {(Object.entries(MODALIDADE_LABEL) as [Modalidade, string][]).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
        )}
        {group.fields.some((f) => f.key === "tempoAcesso") && (
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="course-tempoacesso">Tempo de acesso (sempre 15 dias após a data da prova)</label>
            <input id="course-tempoacesso" className="input" disabled value={tempoAcessoComputed ? fmtDate(tempoAcessoComputed) : "Preencha a Data da prova chave no Concurso"} />
          </div>
        )}
      </div>
      {changed && (
        <button className="btn primary sm" style={{ marginTop: 14 }} onClick={save} disabled={updateProject.isPending || createTask.isPending || updateTask.isPending}>
          {updateProject.isPending || createTask.isPending || updateTask.isPending ? "Salvando…" : "Salvar dados do curso"}
        </button>
      )}
      {group.fields.some((f) => f.key === "cronogramaCompleto") && <CronogramaField project={project} course={course} />}
      {groupKey === "course" && (
        <>
          <EstruturaCursoField project={project} course={course} />
          <OfertaField project={project} course={course} />
        </>
      )}
    </div>
  );
}

// Cronograma completo do curso: cada data digitada aqui é sincronizada
// automaticamente como evento de dia inteiro na Agenda Google fixa (ver
// shared/lib/googleCalendar.ts) — cria na hora de adicionar, atualiza se
// editar, remove da Agenda se excluir daqui.
function CronogramaField({ project, course }: { project: Project; course: Course }) {
  const updateProject = useUpdateProject();
  const { syncScheduleEvent, removeScheduleEvent } = useGoogleImport();
  const [label, setLabel] = useState("");
  const [date, setDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = (course.cronogramaCompleto ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));

  async function persist(next: CronogramaItem[]) {
    await updateProject.mutateAsync({ ...project, course: { ...course, cronogramaCompleto: next } });
  }

  async function addItem() {
    if (!label.trim() || !date) return;
    setError(null);
    setBusy(true);
    try {
      const eventId = await syncScheduleEvent(label.trim(), date, `Projeto: ${project.name}`, null);
      const item: CronogramaItem = { id: newId("cron"), label: label.trim(), date, googleEventId: eventId };
      await persist([...items, item]);
      setLabel("");
    } catch (e) {
      setError((e as Error).message || "Não foi possível sincronizar com a Agenda Google.");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(item: CronogramaItem) {
    setError(null);
    setBusy(true);
    try {
      if (item.googleEventId) {
        try {
          await removeScheduleEvent(item.googleEventId);
        } catch (e) {
          setError(`O item foi removido daqui, mas não foi possível excluir o evento da Agenda: ${(e as Error).message}`);
        }
      }
      await persist(items.filter((i) => i.id !== item.id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div className="section-title" style={{ fontSize: 13, marginBottom: 4 }}>Cronograma completo do curso</div>
      <p className="hint" style={{ marginTop: 0 }}>
        Cada data adicionada aqui entra automaticamente como evento na Agenda Google do curso.
      </p>
      {error && <p className="hint" style={{ color: "var(--danger, #d33)" }}>{error}</p>}
      <div className="row" style={{ marginBottom: 12 }}>
        <div className="field" style={{ margin: 0, flex: 2 }}>
          <input className="input" placeholder="ex: Aula inaugural, Prova, Resultado" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button className="btn primary sm" onClick={addItem} disabled={!label.trim() || busy}>
          {busy ? "Sincronizando…" : "+ Adicionar"}
        </button>
      </div>
      {items.length === 0 ? (
        <div className="hint">Nenhuma data adicionada ainda.</div>
      ) : (
        items.map((item) => (
          <div className="list-item" key={item.id}>
            <div className="stack" style={{ flex: 1 }}>
              <b style={{ fontSize: 13.5 }}>{item.label}</b>
              <span className="muted" style={{ fontSize: 11.5 }}>
                {fmtDate(item.date)} {item.googleEventId ? "· na Agenda Google" : ""}
              </span>
            </div>
            <button className="btn sm ghost" onClick={() => removeItem(item)} disabled={busy}>Remover</button>
          </div>
        ))
      )}
    </div>
  );
}

const ESTRUTURA_SUBTABS = ["coordenacao", "cronograma", "materiais", "legislacaoLocal"] as const;
type EstruturaSubTab = (typeof ESTRUTURA_SUBTABS)[number];
const ESTRUTURA_SUBTAB_LABEL: Record<EstruturaSubTab, string> = {
  coordenacao: "Coordenação", cronograma: "Cronograma", materiais: "Materiais", legislacaoLocal: "Legislação Local",
};

// Diferença em semanas cheias entre duas datas ISO ("YYYY-MM-DD") — usada
// pra "Duração do cronograma em semanas", sempre calculada a partir da
// Data de início do cronograma e da Data da prova chave (aba Concurso),
// nunca guardada separadamente.
function diffWeeks(startISO: string | null, endISO: string | null): number | null {
  if (!startISO || !endISO) return null;
  const start = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Math.round(days / 7);
}

// Estrutura do curso — só existe pras modalidades objetiva/discursiva
// (MODALIDADES_COM_ESTRUTURA); Coordenação/Cronograma/Legislação Local têm
// uma data cada, sincronizada com a SEGUNDA agenda Google fixa (diferente
// da agenda do Cronograma completo do curso, na aba Concurso).
function EstruturaCursoField({ project, course }: { project: Project; course: Course }) {
  const updateProject = useUpdateProject();
  const { syncStructureEvent, removeStructureEvent } = useGoogleImport();
  const [subTab, setSubTab] = useState<EstruturaSubTab>("coordenacao");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const estrutura = course.estruturaCurso;

  if (!course.modalidades || !MODALIDADES_COM_ESTRUTURA.includes(course.modalidades)) {
    return (
      <div className="hint" style={{ marginTop: 20 }}>
        A Estrutura do curso (Coordenação, Cronograma, Materiais, Legislação Local) só se aplica às modalidades Objetiva ou Discursiva. Escolha a modalidade acima para editar.
      </div>
    );
  }

  async function persist(next: EstruturaCurso) {
    await updateProject.mutateAsync({ ...project, course: { ...course, estruturaCurso: next } });
  }
  function setCoordenacao(patch: Partial<Coordenacao>) {
    return persist({ ...estrutura, coordenacao: { ...estrutura.coordenacao, ...patch } });
  }
  function setCronograma(patch: Partial<CronogramaEstrutura>) {
    return persist({ ...estrutura, cronograma: { ...estrutura.cronograma, ...patch } });
  }
  function setMateriais(patch: Partial<MateriaisEstrutura>) {
    return persist({ ...estrutura, materiais: { ...estrutura.materiais, ...patch } });
  }
  function setLegislacaoLocal(patch: Partial<LegislacaoLocalEstrutura>) {
    return persist({ ...estrutura, legislacaoLocal: { ...estrutura.legislacaoLocal, ...patch } });
  }

  async function setStructureDate(
    current: { data: string | null; eventId: string | null },
    dateISO: string,
    summary: string,
    apply: (data: string | null, eventId: string | null) => Promise<void>,
  ) {
    setError(null);
    setBusy(true);
    try {
      if (!dateISO) {
        if (current.eventId) await removeStructureEvent(current.eventId);
        await apply(null, null);
        return;
      }
      const eventId = await syncStructureEvent(summary, dateISO, `Projeto: ${project.name}`, current.eventId);
      await apply(dateISO, eventId);
    } catch (e) {
      setError((e as Error).message || "Não foi possível sincronizar com a Agenda Google.");
    } finally {
      setBusy(false);
    }
  }

  const weeks = diffWeeks(estrutura.cronograma.dataInicio, course.dataProvaChave);

  return (
    <div style={{ marginTop: 24 }}>
      <div className="section-title" style={{ fontSize: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <span className="msi" style={{ fontSize: 16 }}>account_tree</span> Estrutura do curso
      </div>
      {error && <p className="hint" style={{ color: "var(--danger, #d33)" }}>{error}</p>}
      <div className="row" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        {ESTRUTURA_SUBTABS.map((t) => (
          <button key={t} className={`btn sm ${subTab === t ? "primary" : "ghost"}`} onClick={() => setSubTab(t)}>
            {ESTRUTURA_SUBTAB_LABEL[t]}
          </button>
        ))}
      </div>

      {subTab === "coordenacao" && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Coordenador(a)</label>
            <input className="input" value={estrutura.coordenacao.coordenador} onChange={(e) => setCoordenacao({ coordenador: e.target.value })} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Encontro ao vivo de início do curso (obrigatório)</label>
            <input
              type="date" className="input" disabled={busy}
              value={estrutura.coordenacao.encontroInicioData ?? ""}
              onChange={(e) => setStructureDate(
                { data: estrutura.coordenacao.encontroInicioData, eventId: estrutura.coordenacao.encontroInicioEventId },
                e.target.value,
                `Encontro ao vivo de início — ${project.name}`,
                (data, eventId) => setCoordenacao({ encontroInicioData: data, encontroInicioEventId: eventId }),
              )}
            />
            <span className="hint">{estrutura.coordenacao.encontroInicioEventId ? "Sincronizado com a Agenda Google." : "Defina a data para criar o evento na Agenda."}</span>
          </div>
        </div>
      )}

      {subTab === "cronograma" && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Tipo de cronograma (pode marcar mais de um)</label>
            <div className="stack" style={{ gap: 4, marginTop: 4 }}>
              {(Object.entries(TIPO_CRONOGRAMA_LABEL) as [TipoCronograma, string][]).map(([v, label]) => (
                <label key={v} className="row" style={{ gap: 6, fontSize: 12.5, fontWeight: 400 }}>
                  <input
                    type="checkbox" checked={estrutura.cronograma.tipos.includes(v)}
                    onChange={(e) => setCronograma({
                      tipos: e.target.checked ? [...estrutura.cronograma.tipos, v] : estrutura.cronograma.tipos.filter((x) => x !== v),
                    })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Data de início do cronograma</label>
            <input
              type="date" className="input" disabled={busy}
              value={estrutura.cronograma.dataInicio ?? ""}
              onChange={(e) => setStructureDate(
                { data: estrutura.cronograma.dataInicio, eventId: estrutura.cronograma.dataInicioEventId },
                e.target.value,
                `Início do cronograma — ${project.name}`,
                (data, eventId) => setCronograma({ dataInicio: data, dataInicioEventId: eventId }),
              )}
            />
            <span className="hint">{estrutura.cronograma.dataInicioEventId ? "Sincronizado com a Agenda Google." : "Defina a data para criar o evento na Agenda."}</span>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Duração do cronograma em semanas</label>
            <input className="input" disabled value={weeks !== null ? `${weeks} semana(s)` : "Preencha a data de início e a Data da prova chave (aba Concurso)"} />
          </div>
        </div>
      )}

      {subTab === "materiais" && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Matérias</label>
            <textarea className="input" value={estrutura.materiais.materias} onChange={(e) => setMateriais({ materias: e.target.value })} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>PDFs (pode marcar mais de um)</label>
            <div className="stack" style={{ gap: 4, marginTop: 4 }}>
              {(Object.entries(PDF_OPCAO_LABEL) as [PdfOpcao, string][]).map(([v, label]) => (
                <label key={v} className="row" style={{ gap: 6, fontSize: 12.5, fontWeight: 400, alignItems: "flex-start" }}>
                  <input
                    type="checkbox" checked={estrutura.materiais.pdfs.includes(v)}
                    onChange={(e) => setMateriais({
                      pdfs: e.target.checked ? [...estrutura.materiais.pdfs, v] : estrutura.materiais.pdfs.filter((x) => x !== v),
                    })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === "legislacaoLocal" && (
        <div className="stack" style={{ gap: 14 }}>
          <SimNaoField
            title="LegProc"
            explanation="Toda a legislação local elencada no edital, em formato de legproc, grifada e com acréscimo de comentários, quando necessário."
            value={estrutura.legislacaoLocal.legproc}
            onChange={(v) => setLegislacaoLocal({ legproc: v })}
          />
          <SimNaoField
            title={'Lei Local grifada ("LegProc\'s Locais")'}
            explanation={null}
            value={estrutura.legislacaoLocal.leiLocalGrifada}
            onChange={(v) => setLegislacaoLocal({ leiLocalGrifada: v })}
          />
          <SimNaoField
            title="Flashcards"
            explanation="Flashcards das principais leis locais (a critério do coordenador)."
            value={estrutura.legislacaoLocal.flashcards}
            onChange={(v) => setLegislacaoLocal({ flashcards: v })}
          />
          <SimNaoField
            title="Principais artigos"
            explanation="Material com a indicação dos principais artigos por lei (a critério do coordenador)."
            value={estrutura.legislacaoLocal.principaisArtigos}
            onChange={(v) => setLegislacaoLocal({ principaisArtigos: v })}
          />
          <SimNaoField
            title="Legislação local em frases"
            explanation="Material de legislação local em frases (a critério do coordenador)."
            value={estrutura.legislacaoLocal.legislacaoEmFrases}
            onChange={(v) => setLegislacaoLocal({ legislacaoEmFrases: v })}
          />
          <SimNaoField
            title="Videoaulas"
            explanation="Videoaulas com Professores Procuradores abordando Legislação local e Jurisprudência Local (quando pertinente) (a critério do coordenador)."
            value={estrutura.legislacaoLocal.videoaulas}
            onChange={(v) => setLegislacaoLocal({ videoaulas: v })}
          />
          <div className="field" style={{ margin: 0 }}>
            <label>Data de início da parte local</label>
            <input
              type="date" className="input" disabled={busy}
              value={estrutura.legislacaoLocal.dataInicioParteLocal ?? ""}
              onChange={(e) => setStructureDate(
                { data: estrutura.legislacaoLocal.dataInicioParteLocal, eventId: estrutura.legislacaoLocal.dataInicioParteLocalEventId },
                e.target.value,
                `Início da parte local — ${project.name}`,
                (data, eventId) => setLegislacaoLocal({ dataInicioParteLocal: data, dataInicioParteLocalEventId: eventId }),
              )}
            />
            <span className="hint">{estrutura.legislacaoLocal.dataInicioParteLocalEventId ? "Sincronizado com a Agenda Google." : "Defina a data para criar o evento na Agenda."}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SimNaoField({ title, explanation, value, onChange }: { title: string; explanation: string | null; value: SimNaoLista; onChange: (v: SimNaoLista) => void }) {
  return (
    <div className="card card-pad">
      <b style={{ fontSize: 13 }}>{title}</b>
      {explanation && <p className="hint" style={{ marginTop: 4 }}>{explanation}</p>}
      <label className="row" style={{ gap: 6, fontSize: 12.5, fontWeight: 400, marginTop: 6 }}>
        <input type="checkbox" checked={value.ativo} onChange={(e) => onChange({ ...value, ativo: e.target.checked })} />
        Sim
      </label>
      {value.ativo && (
        <textarea
          className="input" style={{ marginTop: 6 }} placeholder="Listagem"
          value={value.lista} onChange={(e) => onChange({ ...value, lista: e.target.value })}
        />
      )}
    </div>
  );
}

function PrecoInputs({ set, onPatch }: { set: PrecoSet; onPatch: (patch: Partial<PrecoSet>) => void }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
      <div className="field" style={{ margin: 0 }}>
        <label>Ancoragem</label>
        <input className="input" value={set.ancoragem} onChange={(e) => onPatch({ ancoragem: e.target.value })} />
      </div>
      <div className="field" style={{ margin: 0 }}>
        <label>À vista</label>
        <input className="input" value={set.aVista} onChange={(e) => onPatch({ aVista: e.target.value })} />
      </div>
      <div className="field" style={{ margin: 0 }}>
        <label>Parcelamento</label>
        <input className="input" value={set.parcelamento} onChange={(e) => onPatch({ parcelamento: e.target.value })} />
      </div>
    </div>
  );
}

// Guia destacada "OFERTA" — preço único, exceto nas modalidades com correção
// opcional (MODALIDADES_PRECO_DUPLO), onde vira dois preços (com/sem correção).
function OfertaField({ project, course }: { project: Project; course: Course }) {
  const updateProject = useUpdateProject();
  const oferta = course.oferta;
  const dual = Boolean(course.modalidades) && MODALIDADES_PRECO_DUPLO.includes(course.modalidades as Modalidade);

  function persist(next: Oferta) {
    return updateProject.mutateAsync({ ...project, course: { ...course, oferta: next } });
  }
  function setPreco(key: "preco" | "precoComCorrecao" | "precoSemCorrecao", patch: Partial<PrecoSet>) {
    return persist({ ...oferta, [key]: { ...oferta[key], ...patch } });
  }

  return (
    <div style={{ marginTop: 24, padding: 14, borderRadius: 12, background: "var(--accent-weak)", border: "1px solid var(--accent)" }}>
      <div className="section-title" style={{ fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 8, color: "var(--accent-text)" }}>
        <span className="msi" style={{ fontSize: 16 }}>sell</span> OFERTA
      </div>
      <b style={{ fontSize: 12.5, display: "block", marginBottom: 8 }}>Preço</b>
      {dual ? (
        <div className="stack" style={{ gap: 14 }}>
          <div>
            <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Com correção</span>
            <PrecoInputs set={oferta.precoComCorrecao} onPatch={(p) => setPreco("precoComCorrecao", p)} />
          </div>
          <div>
            <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Sem correção</span>
            <PrecoInputs set={oferta.precoSemCorrecao} onPatch={(p) => setPreco("precoSemCorrecao", p)} />
          </div>
        </div>
      ) : (
        <PrecoInputs set={oferta.preco} onPatch={(p) => setPreco("preco", p)} />
      )}
    </div>
  );
}

function KeyDatesTab({ project }: { project: Project }) {
  const updateProject = useUpdateProject();
  const [label, setLabel] = useState("");
  const [date, setDate] = useState(todayISO());
  const dates = (project.briefing.keyDates ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));

  async function addDate() {
    if (!label.trim() || !date) return;
    const newDate: KeyDate = { id: `kd_${Date.now()}`, label: label.trim(), date };
    await updateProject.mutateAsync({ ...project, briefing: { ...project.briefing, keyDates: [...(project.briefing.keyDates ?? []), newDate] } });
    setLabel("");
  }

  async function removeDate(dateId: string) {
    await updateProject.mutateAsync({ ...project, briefing: { ...project.briefing, keyDates: (project.briefing.keyDates ?? []).filter((k) => k.id !== dateId) } });
  }

  return (
    <div>
      <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
        Datas que orientam todos os setores neste curso — ex: início das vendas, início das aulas, prova, resultado.
      </p>
      <div className="row" style={{ marginBottom: 16 }}>
        <div className="field" style={{ margin: 0, flex: 2 }}>
          <input className="input" placeholder="ex: Início das vendas" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button className="btn primary sm" onClick={addDate} disabled={!label.trim() || updateProject.isPending}>+ Adicionar</button>
      </div>
      {dates.length === 0 && <div className="hint">Nenhuma data-chave cadastrada ainda.</div>}
      {dates.map((k) => (
        <div className="list-item" key={k.id}>
          <div className="stack" style={{ flex: 1 }}><b style={{ fontSize: 13.5 }}>{k.label}</b></div>
          <span className="badge b-soft">{fmtDate(k.date)}</span>
          <button className="btn sm ghost" onClick={() => removeDate(k.id)}><span className="msi">delete</span></button>
        </div>
      ))}
    </div>
  );
}

function GuiasTab({ project }: { project: Project }) {
  const updateProject = useUpdateProject();
  const template = project.courseType ? GUIA_TEMPLATES[project.courseType] : null;
  const [activeGuia, setActiveGuia] = useState<string | null>(template?.[0]?.key ?? null);
  const [draft, setDraft] = useState<string | null>(null);

  async function setCourseType(courseType: CourseType) {
    const newTemplate = GUIA_TEMPLATES[courseType];
    await updateProject.mutateAsync({ ...project, courseType });
    setActiveGuia(newTemplate[0]?.key ?? null);
  }

  const currentGuia = (project.guias ?? []).find((g) => g.key === activeGuia);
  const text = draft ?? currentGuia?.content ?? "";
  const changed = draft !== null && draft !== (currentGuia?.content ?? "");

  async function saveGuia() {
    if (!activeGuia) return;
    const others = (project.guias ?? []).filter((g) => g.key !== activeGuia);
    const updated: GuiaContent[] = [...others, { key: activeGuia, content: text }];
    await updateProject.mutateAsync({ ...project, guias: updated });
    setDraft(null);
  }

  async function updateMessages(messages: ScheduledMessage[]) {
    await updateProject.mutateAsync({ ...project, scheduledMessages: messages });
  }

  const item = template?.find((g) => g.key === activeGuia);

  return (
    <div>
      <div className="field" style={{ maxWidth: 340 }}>
        <label htmlFor="course-type">Tipo de curso</label>
        <select id="course-type" className="input" value={project.courseType ?? ""} onChange={(e) => setCourseType(e.target.value as CourseType)}>
          <option value="" disabled>— Selecione o modelo —</option>
          {Object.entries(COURSE_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {!template && <div className="hint" style={{ marginTop: 12 }}>Escolha um tipo de curso para ver as guias por setor deste modelo.</div>}

      {template && (
        <>
          <div className="seg" style={{ margin: "16px 0", flexWrap: "wrap" }}>
            {template.map((g) => (
              <button key={g.key} className={activeGuia === g.key ? "on" : ""} onClick={() => { setActiveGuia(g.key); setDraft(null); }}>{g.label}</button>
            ))}
          </div>
          {item?.hint && <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>{item.hint}</p>}
          <textarea
            key={activeGuia}
            className="input"
            style={{ minHeight: 160 }}
            value={text}
            onChange={(e) => setDraft(e.target.value)}
          />
          {changed && (
            <button className="btn primary sm" style={{ marginTop: 10 }} onClick={saveGuia} disabled={updateProject.isPending}>
              {updateProject.isPending ? "Salvando…" : "Salvar guia"}
            </button>
          )}

          {activeGuia === "EVENTO" && project.courseType === "semana_vespera" && (
            <ScheduledMessagesTable messages={project.scheduledMessages ?? []} onChange={updateMessages} saving={updateProject.isPending} />
          )}
        </>
      )}
    </div>
  );
}

function ScheduledMessagesTable({ messages, onChange, saving }: { messages: ScheduledMessage[]; onChange: (m: ScheduledMessage[]) => void; saving: boolean }) {
  const [label, setLabel] = useState("");
  const [date, setDate] = useState(todayISO());

  function add() {
    if (!label.trim()) return;
    onChange([...messages, { id: `msg_${Date.now()}`, label: label.trim(), date, status: "programar" }]);
    setLabel("");
  }
  function remove(id: string) {
    onChange(messages.filter((m) => m.id !== id));
  }
  function toggleStatus(id: string) {
    onChange(messages.map((m) => (m.id === id ? { ...m, status: m.status === "enviado" ? "programar" : "enviado" } : m)));
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div className="section-title" style={{ fontSize: 13 }}>Mensagens programadas para grupos</div>
      <div className="row" style={{ marginBottom: 12 }}>
        <div className="field" style={{ margin: 0, flex: 2 }}>
          <input className="input" placeholder="ex: Lembrete — aula começa em 1h" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button className="btn primary sm" onClick={add} disabled={!label.trim() || saving}>+ Adicionar</button>
      </div>
      {messages.length === 0 && <div className="hint">Nenhuma mensagem programada ainda.</div>}
      {messages.length > 0 && (
        <div className="tbl-wrap">
          <table className="data">
            <thead><tr><th>Mensagem</th><th>Data</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id}>
                  <td>{m.label}</td>
                  <td>{fmtDate(m.date)}</td>
                  <td>
                    <button className={`badge ${m.status === "enviado" ? "b-done" : "b-soft"}`} style={{ border: "none", cursor: "pointer" }} onClick={() => toggleStatus(m.id)}>
                      {m.status === "enviado" ? "Enviado" : "Programar"}
                    </button>
                  </td>
                  <td><button className="btn sm ghost" onClick={() => remove(m.id)}><span className="msi">delete</span></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LinksTab({ project }: { project: Project }) {
  const updateProject = useUpdateProject();
  const [departmentId, setDepartmentId] = useState(STANDARD_DEPARTMENTS[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  async function addLink() {
    if (!label.trim() || !url.trim()) return;
    const newLink: SectorLink = { id: `lnk_${Date.now()}`, departmentId, label: label.trim(), url: url.trim() };
    await updateProject.mutateAsync({ ...project, sectorLinks: [...(project.sectorLinks ?? []), newLink] });
    setLabel("");
    setUrl("");
  }

  async function removeLink(id: string) {
    await updateProject.mutateAsync({ ...project, sectorLinks: (project.sectorLinks ?? []).filter((l) => l.id !== id) });
  }

  const links = project.sectorLinks ?? [];

  return (
    <div>
      <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
        Links úteis deste curso/projeto, organizados por setor — planilhas, pastas do Drive, formulários, etc.
      </p>
      <div className="row" style={{ marginBottom: 16 }}>
        <div className="field" style={{ margin: 0 }}>
          <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            {STANDARD_DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0, flex: 1 }}>
          <input className="input" placeholder="Nome do link" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="field" style={{ margin: 0, flex: 2 }}>
          <input className="input" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <button className="btn primary sm" onClick={addLink} disabled={!label.trim() || !url.trim() || updateProject.isPending}>+ Adicionar</button>
      </div>

      {STANDARD_DEPARTMENTS.map((d) => {
        const deptLinks = links.filter((l) => l.departmentId === d.id);
        if (deptLinks.length === 0) return null;
        return (
          <div key={d.id} style={{ marginBottom: 14 }}>
            <div className="section-title" style={{ fontSize: 13 }}>{d.icon} {d.name}</div>
            {deptLinks.map((l) => (
              <div className="list-item" key={l.id}>
                <a href={safeHref(l.url)} target="_blank" rel="noreferrer" style={{ flex: 1 }}>{l.label}</a>
                <button className="btn sm ghost" onClick={() => removeLink(l.id)}><span className="msi">delete</span></button>
              </div>
            ))}
          </div>
        );
      })}
      {links.length === 0 && <div className="hint">Nenhum link cadastrado ainda.</div>}
    </div>
  );
}

// Anexa o arquivo em si (link do Drive) ao projeto — diferente da aba
// Briefing, que importa o texto pra dentro de um campo. Aqui o documento
// original fica sempre acessível, e vários arquivos podem ficar anexados.
function DocumentsTab({ project }: { project: Project }) {
  const updateProject = useUpdateProject();
  const { pickAnyFile } = useGoogleImport();
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const documents = project.documents ?? [];

  async function addDocument() {
    setError(null);
    setImporting(true);
    try {
      const picked = await pickAnyFile();
      if (!picked) return;
      const doc: ProjectDocument = { id: newId("doc"), name: picked.name, url: picked.url, addedAt: new Date().toISOString() };
      await updateProject.mutateAsync({ ...project, documents: [...documents, doc] });
    } catch (e) {
      setError((e as Error).message || "Não foi possível abrir o seletor do Drive.");
    } finally {
      setImporting(false);
    }
  }

  async function removeDocument(id: string) {
    await updateProject.mutateAsync({ ...project, documents: documents.filter((d) => d.id !== id) });
  }

  return (
    <div>
      <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
        Arquivos do projeto (edital em PDF, planilhas, docs...) — anexa o link do Drive, sem alterar o arquivo original.
      </p>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn sm ghost" onClick={addDocument} disabled={importing}>
          <span className="msi">folder_open</span> {importing ? "Abrindo o Drive…" : "Importar do Drive"}
        </button>
      </div>
      {error && <p className="hint" style={{ color: "var(--danger, #d33)" }}>{error}</p>}
      {documents.length === 0 && <div className="hint">Nenhum documento anexado ainda.</div>}
      {documents.map((d) => (
        <div className="list-item" key={d.id}>
          <a href={safeHref(d.url)} target="_blank" rel="noreferrer" style={{ flex: 1 }}>{d.name}</a>
          <span className="muted" style={{ fontSize: 11 }}>{fmtDate(d.addedAt.slice(0, 10))}</span>
          <button className="btn sm ghost" onClick={() => removeDocument(d.id)}><span className="msi">delete</span></button>
        </div>
      ))}
    </div>
  );
}

function TasksTab({ tasks, users }: { tasks: ReturnType<typeof useTasks>["data"]; users: ReturnType<typeof useUsers>["data"] }) {
  const list = tasks ?? [];
  return (
    <div>
      {list.length === 0 && <div className="hint">Nenhuma tarefa vinculada a este projeto ainda.</div>}
      {list.map((task) => (
        <div className="list-item" key={task.id}>
          <div className="stack" style={{ flex: 1 }}>
            <b style={{ fontSize: 13.5 }}>{task.title}</b>
            <span className="muted" style={{ fontSize: 11.5 }}>{userName(users, task.responsibleId)}</span>
          </div>
          <span className="badge b-soft">{STATUS_LABEL[task.status]}</span>
          <span className={`badge b-${dueStatus(task.dueDate, task.status)}`}>{fmtDate(task.dueDate)}</span>
        </div>
      ))}
    </div>
  );
}
