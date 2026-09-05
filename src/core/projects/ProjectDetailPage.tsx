import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext";
import { useTasks } from "../tasks/useTasks";
import { userName, useUsers } from "../team/useUsers";
import { useProjects, useUpdateProject } from "./useProjects";
import { PROJECT_STATUS_LABEL } from "./types";
import { STATUS_LABEL } from "../tasks/types";
import { dueStatus, fmtDate } from "../../shared/lib/dates";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: projects, isLoading } = useProjects();
  const { data: tasks } = useTasks();
  const { data: users } = useUsers();
  const { profile } = useAuth();
  const updateProject = useUpdateProject();
  const [briefingDraft, setBriefingDraft] = useState<string | null>(null);

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
  const briefingText = briefingDraft ?? project.briefing.content;
  const briefingChanged = briefingDraft !== null && briefingDraft !== project.briefing.content;

  const saveBriefing = async () => {
    await updateProject.mutateAsync({
      ...project,
      briefing: { ...project.briefing, content: briefingText, updatedAt: new Date().toISOString(), updatedBy: profile?.id ?? null },
    });
    setBriefingDraft(null);
  };

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
          <div className="section-title">Briefing</div>
          <textarea
            className="input"
            style={{ minHeight: 160 }}
            value={briefingText}
            onChange={(e) => setBriefingDraft(e.target.value)}
            placeholder="Contexto, objetivos e informações-chave do projeto para os setores envolvidos."
          />
          {briefingChanged && (
            <button className="btn primary sm" style={{ marginTop: 10 }} onClick={saveBriefing} disabled={updateProject.isPending}>
              {updateProject.isPending ? "Salvando…" : "Salvar briefing"}
            </button>
          )}

          <div className="section-title" style={{ marginTop: 22 }}>
            Tarefas do projeto <span className="count">{projectTasks.length}</span>
          </div>
          {projectTasks.length === 0 && <div className="hint">Nenhuma tarefa vinculada a este projeto ainda.</div>}
          {projectTasks.map((task) => (
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
