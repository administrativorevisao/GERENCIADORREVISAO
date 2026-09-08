import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext";
import { isAdmin } from "../../shared/auth/types";
import { useTasks } from "../tasks/useTasks";
import { usePrograms, useProjects, useUpdateProject } from "./useProjects";
import { ProgramModal } from "./ProgramModal";
import { ProjectModal } from "./ProjectModal";
import { ProjectImportModal } from "./ProjectImportModal";
import { downloadProjectTemplate } from "./projectTemplate";
import { PROJECT_STATUS_LABEL, type Program, type Project } from "./types";

const DRAG_MIME = "application/x-revisao-project-id";

function ProjectCard({ project, draggable, onDragStart, onDragEnd }: {
  project: Project;
  draggable: boolean;
  onDragStart: (e: React.DragEvent, project: Project) => void;
  onDragEnd: () => void;
}) {
  return (
    <Link
      to={`/projetos/${project.id}`}
      className="card card-pad"
      style={{ display: "block", color: "inherit", cursor: draggable ? "grab" : undefined }}
      draggable={draggable}
      onDragStart={(e) => onDragStart(e, project)}
      onDragEnd={onDragEnd}
    >
      <div className="row" style={{ alignItems: "flex-start", gap: 8 }}>
        <b style={{ flex: 1 }}>{project.name}</b>
        <span className={`badge ${project.status === "done" ? "b-done" : "b-soft"}`} style={{ flex: "none" }}>
          {PROJECT_STATUS_LABEL[project.status]}
        </span>
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{project.description || "Sem descrição"}</div>
    </Link>
  );
}

function programProgress(program: Program, projects: Project[], tasks: { status: string; projectId: string | null }[]) {
  const progProjects = projects.filter((p) => p.programId === program.id);
  const projectIds = new Set(progProjects.map((p) => p.id));
  const relevantTasks = tasks.filter((t) => t.projectId && projectIds.has(t.projectId));
  const done = relevantTasks.filter((t) => t.status === "done").length;
  const percent = relevantTasks.length ? Math.round((done / relevantTasks.length) * 100) : 0;
  return { projects: progProjects, total: relevantTasks.length, done, percent };
}

export function ProjectsPage() {
  const { profile } = useAuth();
  const { data: programs, isLoading: loadingPrograms } = usePrograms();
  const { data: projects, isLoading: loadingProjects, refetch: refetchProjects } = useProjects();
  const { data: tasks } = useTasks();
  const updateProject = useUpdateProject();
  const [newProgram, setNewProgram] = useState(false);
  const [newProjectIn, setNewProjectIn] = useState<Program | null>(null);
  const [importing, setImporting] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null); // programId, or "none"

  if (loadingPrograms || loadingProjects) return <div className="empty">Carregando projetos…</div>;

  const admin = isAdmin(profile);
  const progs = programs ?? [];
  const projs = projects ?? [];
  const allTasks = tasks ?? [];

  function handleDragStart(e: React.DragEvent, project: Project) {
    e.dataTransfer.setData(DRAG_MIME, project.id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(project.id);
  }

  function handleDrop(e: React.DragEvent, programId: string | null) {
    e.preventDefault();
    setDragOverTarget(null);
    const projectId = e.dataTransfer.getData(DRAG_MIME) || draggingId;
    setDraggingId(null);
    if (!projectId) return;
    const project = projs.find((p) => p.id === projectId);
    if (!project || project.programId === programId) return;
    updateProject.mutate({ ...project, programId });
  }

  function dropZoneProps(target: string) {
    return {
      onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOverTarget(target); },
      onDragLeave: () => setDragOverTarget((cur) => (cur === target ? null : cur)),
    };
  }

  return (
    <div>
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>
          <span className="msi">folder</span> Projetos por programa <span className="count">{projs.length} projeto(s) · {progs.length} programas</span>
        </div>
        <span style={{ flex: 1 }} />
        {admin && (
          <>
            <button className="btn sm ghost" onClick={downloadProjectTemplate}>Modelo</button>
            <button className="btn sm" onClick={() => setImporting(true)}>
              <span className="msi">folder_open</span> Importar do Drive
            </button>
            <button className="btn sm" onClick={() => setNewProgram(true)}>+ Novo programa</button>
            <button className="btn primary sm" onClick={() => setNewProjectIn({} as Program)}>+ Novo projeto</button>
          </>
        )}
      </div>

      {progs.length === 0 && (
        <div className="empty">
          <div className="big msi">folder</div>
          Nenhum programa cadastrado.
          {admin && <div>Clique em <b>+ Novo programa</b> para começar.</div>}
        </div>
      )}

      {progs.map((program) => {
        const { projects: progProjects, done, total, percent } = programProgress(program, projs, allTasks);
        const isOver = dragOverTarget === program.id;
        return (
          <div
            key={program.id}
            className="card card-pad"
            style={{
              marginBottom: 14,
              borderLeft: `4px solid ${program.color}`,
              outline: isOver ? "2px dashed var(--accent, #6a5acd)" : undefined,
              outlineOffset: isOver ? 2 : undefined,
            }}
            {...(admin ? dropZoneProps(program.id) : {})}
            onDrop={admin ? (e) => handleDrop(e, program.id) : undefined}
          >
            <div className="row" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", fontSize: 22, background: `color-mix(in srgb, ${program.color} 16%, transparent)`, flex: "none" }}>
                {program.icon}
              </div>
              <div className="stack">
                <b style={{ fontSize: 16 }}>{program.name}</b>
                <span className="muted" style={{ fontSize: 12 }}>{program.description}</span>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{percent}%</div>
                <div className="muted" style={{ fontSize: 11 }}>{progProjects.length} projeto(s) · {done}/{total} tarefas</div>
              </div>
              {admin && (
                <button className="btn primary sm" onClick={() => setNewProjectIn(program)}>+ Projeto</button>
              )}
            </div>
            <div className="progress" style={{ marginTop: 10 }}>
              <span style={{ width: `${percent}%`, background: program.color }} />
            </div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", marginTop: 12 }}>
              {progProjects.length === 0 && (
                <div className="hint">{admin ? "Nenhum projeto neste programa ainda. Arraste um projeto até aqui para vinculá-lo." : "Nenhum projeto neste programa ainda."}</div>
              )}
              {progProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  draggable={admin}
                  onDragStart={handleDragStart}
                  onDragEnd={() => { setDraggingId(null); setDragOverTarget(null); }}
                />
              ))}
            </div>
          </div>
        );
      })}

      {(() => {
        const noProgram = projs.filter((p) => !p.programId);
        const isOver = dragOverTarget === "none";
        if (noProgram.length === 0 && !admin) return null;
        return (
          <div
            className="card card-pad"
            style={{
              marginBottom: 14,
              outline: isOver ? "2px dashed var(--accent, #6a5acd)" : undefined,
              outlineOffset: isOver ? 2 : undefined,
            }}
            {...(admin ? dropZoneProps("none") : {})}
            onDrop={admin ? (e) => handleDrop(e, null) : undefined}
          >
            <div className="row" style={{ alignItems: "center", gap: 12 }}>
              <div className="stack">
                <b style={{ fontSize: 16 }}>Sem programa</b>
                <span className="muted" style={{ fontSize: 12 }}>Projetos ainda não vinculados a um programa</span>
              </div>
              <div style={{ marginLeft: "auto" }} className="muted">{noProgram.length} projeto(s)</div>
            </div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", marginTop: 12 }}>
              {noProgram.length === 0 && admin && (
                <div className="hint">Arraste um projeto até aqui para remover o programa.</div>
              )}
              {noProgram.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  draggable={admin}
                  onDragStart={handleDragStart}
                  onDragEnd={() => { setDraggingId(null); setDragOverTarget(null); }}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {newProgram && <ProgramModal onClose={() => setNewProgram(false)} />}
      {newProjectIn && (
        <ProjectModal
          program={newProjectIn.id ? newProjectIn : undefined}
          onClose={() => setNewProjectIn(null)}
        />
      )}
      {importing && (
        <ProjectImportModal
          projects={projs}
          programs={progs}
          onClose={() => setImporting(false)}
          onDone={() => refetchProjects()}
        />
      )}
    </div>
  );
}
