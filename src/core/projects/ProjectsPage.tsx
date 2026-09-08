import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext";
import { isAdmin } from "../../shared/auth/types";
import { useTasks } from "../tasks/useTasks";
import { usePrograms, useProjects, useUpdateProject } from "./useProjects";
import { ProgramModal } from "./ProgramModal";
import { ProjectModal } from "./ProjectModal";
import { ProjectImportModal } from "./ProjectImportModal";
import { SubProgramModal } from "./SubProgramModal";
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

// Dentro de um programa, os projetos podem estar agrupados por subprograma
// (ex: cada concurso dentro do programa "Perpétuo"). O que não estiver
// ligado a nenhum subprograma existente cai em "ungrouped".
function groupBySubProgram(program: Program, progProjects: Project[]) {
  const bySub = new Map<string, Project[]>();
  for (const sp of program.subPrograms) bySub.set(sp.id, []);
  const ungrouped: Project[] = [];
  for (const p of progProjects) {
    if (p.subProgramId && bySub.has(p.subProgramId)) bySub.get(p.subProgramId)!.push(p);
    else ungrouped.push(p);
  }
  return { bySub, ungrouped };
}

export function ProjectsPage() {
  const { profile } = useAuth();
  const { data: programs, isLoading: loadingPrograms } = usePrograms();
  const { data: projects, isLoading: loadingProjects, refetch: refetchProjects } = useProjects();
  const { data: tasks } = useTasks();
  const updateProject = useUpdateProject();
  const [newProgram, setNewProgram] = useState(false);
  const [newProjectIn, setNewProjectIn] = useState<Program | null>(null);
  const [newSubProgramIn, setNewSubProgramIn] = useState<Program | null>(null);
  const [importing, setImporting] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null); // programId, "none", or "sub:<id>"

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

  function handleDrop(e: React.DragEvent, programId: string | null, subProgramId: string | null = null) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);
    const projectId = e.dataTransfer.getData(DRAG_MIME) || draggingId;
    setDraggingId(null);
    if (!projectId) return;
    const project = projs.find((p) => p.id === projectId);
    if (!project || (project.programId === programId && project.subProgramId === subProgramId)) return;
    updateProject.mutate({ ...project, programId, subProgramId });
  }

  function dropZoneProps(target: string) {
    return {
      onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOverTarget(target); },
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
        const { bySub, ungrouped } = groupBySubProgram(program, progProjects);
        const hasSubPrograms = program.subPrograms.length > 0;
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
            onDrop={admin ? (e) => handleDrop(e, program.id, null) : undefined}
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
                <>
                  <button className="btn sm ghost" onClick={() => setNewSubProgramIn(program)}>+ Concurso</button>
                  <button className="btn primary sm" onClick={() => setNewProjectIn(program)}>+ Projeto</button>
                </>
              )}
            </div>
            <div className="progress" style={{ marginTop: 10 }}>
              <span style={{ width: `${percent}%`, background: program.color }} />
            </div>

            {!hasSubPrograms && (
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
            )}

            {hasSubPrograms && program.subPrograms.map((sp) => {
              const spProjects = bySub.get(sp.id) ?? [];
              const isOverSub = dragOverTarget === `sub:${sp.id}`;
              return (
                <div
                  key={sp.id}
                  className="card card-pad"
                  style={{
                    marginTop: 10,
                    background: "color-mix(in srgb, currentColor 4%, transparent)",
                    outline: isOverSub ? "2px dashed var(--accent, #6a5acd)" : undefined,
                    outlineOffset: isOverSub ? 2 : undefined,
                  }}
                  {...(admin ? dropZoneProps(`sub:${sp.id}`) : {})}
                  onDrop={admin ? (e) => handleDrop(e, program.id, sp.id) : undefined}
                >
                  <div className="row" style={{ alignItems: "center", gap: 8 }}>
                    <span className="msi" style={{ fontSize: 16 }}>gavel</span>
                    <b style={{ fontSize: 13 }}>{sp.name}</b>
                    <span className="muted" style={{ fontSize: 11 }}>{spProjects.length} projeto(s)</span>
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", marginTop: 8 }}>
                    {spProjects.length === 0 && (
                      <div className="hint">Arraste aqui os projetos deste concurso.</div>
                    )}
                    {spProjects.map((project) => (
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

            {hasSubPrograms && (
              <div
                className="card card-pad"
                style={{
                  marginTop: 10,
                  outline: dragOverTarget === `none-in:${program.id}` ? "2px dashed var(--accent, #6a5acd)" : undefined,
                  outlineOffset: dragOverTarget === `none-in:${program.id}` ? 2 : undefined,
                }}
                {...(admin ? dropZoneProps(`none-in:${program.id}`) : {})}
                onDrop={admin ? (e) => handleDrop(e, program.id, null) : undefined}
              >
                <span className="muted" style={{ fontSize: 11 }}>Sem concurso definido</span>
                <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", marginTop: 8 }}>
                  {ungrouped.length === 0 && <div className="hint">Arraste aqui para tirar um projeto de um concurso.</div>}
                  {ungrouped.map((project) => (
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
            )}
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
      {newSubProgramIn && (
        <SubProgramModal program={newSubProgramIn} onClose={() => setNewSubProgramIn(null)} />
      )}
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
