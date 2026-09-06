import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext";
import { useTasks } from "../tasks/useTasks";
import { userName, useUsers } from "../team/useUsers";
import { useProjects, useUpdateProject } from "./useProjects";
import { emptyCourse, PROJECT_STATUS_LABEL, type Course, type KeyDate, type Project } from "./types";
import { STATUS_LABEL } from "../tasks/types";
import { dueStatus, fmtDate, todayISO } from "../../shared/lib/dates";

type Tab = "briefing" | "course" | "dates" | "tasks";
const TABS: { id: Tab; label: string }[] = [
  { id: "briefing", label: "Briefing" },
  { id: "course", label: "Curso / Edital" },
  { id: "dates", label: "Datas-chave" },
  { id: "tasks", label: "Tarefas" },
];

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: projects, isLoading } = useProjects();
  const { data: tasks } = useTasks();
  const { data: users } = useUsers();
  const [tab, setTab] = useState<Tab>("briefing");

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
        <span className="badge b-soft" style={{ marginLeft: "auto" }}>{PROJECT_STATUS_LABEL[project.status]}</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", gap: 16, alignItems: "start" }}>
        <div className="card card-pad">
          <div className="seg" style={{ marginBottom: 16 }}>
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>
          {tab === "briefing" && <BriefingTab project={project} />}
          {tab === "course" && <CourseTab project={project} />}
          {tab === "dates" && <KeyDatesTab project={project} />}
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
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? project.briefing.content;
  const changed = draft !== null && draft !== project.briefing.content;

  async function save() {
    await updateProject.mutateAsync({
      ...project,
      briefing: { ...project.briefing, content: text, updatedAt: new Date().toISOString(), updatedBy: profile?.id ?? null },
    });
    setDraft(null);
  }

  return (
    <div>
      <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
        Documento central deste curso/projeto — contexto, objetivos e o que cada setor precisa saber. As datas
        que orientam todos os setores ficam na aba <b>Datas-chave</b>, e os dados do edital/curso na aba <b>Curso / Edital</b>.
      </p>
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

const COURSE_FIELD_GROUPS: { title: string; fields: { key: keyof Course; label: string }[] }[] = [
  {
    title: "Edital",
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
  {
    title: "Curso (comercial / operacional)",
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
];
const LONG_FIELDS = new Set<keyof Course>(["analiseEdital", "observacoes", "disciplinas"]);

function CourseTab({ project }: { project: Project }) {
  const updateProject = useUpdateProject();
  const [draft, setDraft] = useState<Course | null>(null);
  const course = draft ?? project.course ?? emptyCourse;
  const changed = draft !== null;

  function setField(key: keyof Course, value: string) {
    setDraft({ ...course, [key]: value });
  }

  async function save() {
    await updateProject.mutateAsync({ ...project, course });
    setDraft(null);
  }

  return (
    <div>
      <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
        Dados do edital/curso — a fonte única para pedagógico, comercial, marketing e CS não ficarem perguntando
        um pro outro.
      </p>
      {COURSE_FIELD_GROUPS.map((group) => (
        <div key={group.title} style={{ marginBottom: 18 }}>
          <div className="section-title" style={{ fontSize: 13 }}>{group.title}</div>
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
        </div>
      ))}
      {changed && (
        <button className="btn primary sm" onClick={save} disabled={updateProject.isPending}>
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
