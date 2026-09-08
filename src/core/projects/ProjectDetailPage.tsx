import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext";
import { isAdmin } from "../../shared/auth/types";
import { useTasks } from "../tasks/useTasks";
import { userName, useUsers } from "../team/useUsers";
import { useProjects, useUpdateProject } from "./useProjects";
import { emptyCourse, PROJECT_STATUS_LABEL, type Course, type KeyDate, type Project, type ProjectStatus } from "./types";
import { COURSE_TYPE_LABEL, GUIA_TEMPLATES, type CourseType, type GuiaContent, type ScheduledMessage, type SectorLink } from "./guiaTemplates";
import { STANDARD_DEPARTMENTS } from "../companies/companies";
import { STATUS_LABEL } from "../tasks/types";
import { dueStatus, fmtDate, todayISO } from "../../shared/lib/dates";
import { useGoogleImport } from "../../shared/lib/useGoogleImport";

type Tab = "briefing" | "edital" | "course" | "guias" | "dates" | "links" | "tasks";
const TABS: { id: Tab; label: string }[] = [
  { id: "briefing", label: "Briefing" },
  { id: "edital", label: "Edital" },
  { id: "course", label: "Curso" },
  { id: "guias", label: "Guias por setor" },
  { id: "dates", label: "Datas-chave" },
  { id: "links", label: "Links" },
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
  const admin = isAdmin(profile);

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
        <div className="stack">
          <b style={{ fontSize: 20 }}>{project.name}</b>
          <span className="muted" style={{ fontSize: 13 }}>{project.description || "Sem descrição"}</span>
        </div>
        {admin ? (
          <select
            className="input" style={{ marginLeft: "auto", width: "auto", padding: "6px 10px", fontSize: 12.5 }}
            value={project.status}
            onChange={(e) => updateProject.mutate({ ...project, status: e.target.value as ProjectStatus })}
          >
            {Object.entries(PROJECT_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        ) : (
          <span className="badge b-soft" style={{ marginLeft: "auto" }}>{PROJECT_STATUS_LABEL[project.status]}</span>
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
    title: "Edital",
    intro: "Informações gerais do edital — a fonte única para todos os setores não ficarem se perguntando.",
    fields: [
      { key: "orgaoEstado", label: "Órgão / Estado" },
      { key: "cargoCarreira", label: "Cargo / Carreira" },
      { key: "vagas", label: "Vagas" },
      { key: "remuneracao", label: "Remuneração" },
      { key: "banca", label: "Banca" },
      { key: "linkConcurso", label: "Link do concurso" },
      { key: "disciplinas", label: "Disciplinas" },
      { key: "analiseEdital", label: "Análise do edital" },
      { key: "observacoes", label: "Observações" },
    ],
  },
  course: {
    title: "Curso",
    intro: "Dados comerciais/operacionais do curso — coordenação, cronograma, preço, condições.",
    fields: [
      { key: "coordenador", label: "Coordenador(a)" },
      { key: "modalidades", label: "Modalidades" },
      { key: "inicioVendas", label: "Início das vendas" },
      { key: "tempoAcesso", label: "Tempo de acesso" },
      { key: "tipoCronograma", label: "Tipo de cronograma" },
      { key: "duracaoSemanas", label: "Duração (semanas)" },
      { key: "preco", label: "Preço" },
      { key: "parcelamento", label: "Parcelamento" },
      { key: "condicoesComercialCs", label: "Condições comercial/CS" },
    ],
  },
};
const LONG_FIELDS = new Set<keyof Course>(["analiseEdital", "observacoes", "disciplinas"]);

function CourseTab({ project, groupKey }: { project: Project; groupKey: "edital" | "course" }) {
  const updateProject = useUpdateProject();
  const [draft, setDraft] = useState<Course | null>(null);
  const course = draft ?? project.course ?? emptyCourse;
  const changed = draft !== null;
  const group = COURSE_FIELD_GROUPS[groupKey];

  function setField(key: keyof Course, value: string) {
    setDraft({ ...course, [key]: value });
  }

  async function save() {
    await updateProject.mutateAsync({ ...project, course });
    setDraft(null);
  }

  return (
    <div>
      <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>{group.intro}</p>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {group.fields.map((f) => (
          <div className="field" key={f.key} style={{ margin: 0 }}>
            <label htmlFor={`course-${f.key}`}>{f.label}</label>
            {LONG_FIELDS.has(f.key) ? (
              <textarea id={`course-${f.key}`} className="input" value={course[f.key]} onChange={(e) => setField(f.key, e.target.value)} />
            ) : (
              <input id={`course-${f.key}`} className="input" value={course[f.key]} onChange={(e) => setField(f.key, e.target.value)} />
            )}
          </div>
        ))}
      </div>
      {changed && (
        <button className="btn primary sm" style={{ marginTop: 14 }} onClick={save} disabled={updateProject.isPending}>
          {updateProject.isPending ? "Salvando…" : "Salvar dados do curso"}
        </button>
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
                <a href={l.url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>{l.label}</a>
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
