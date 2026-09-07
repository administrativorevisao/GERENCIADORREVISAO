import { useState } from "react";
import { useAuth } from "../../shared/auth/AuthContext";
import { isAdmin } from "../../shared/auth/types";
import { fmtDate } from "../../shared/lib/dates";
import { userName, useUsers } from "../team/useUsers";
import { useTasks } from "../tasks/useTasks";
import { ProcedureModal } from "./ProcedureModal";
import { StartRunModal } from "./StartRunModal";
import { useProcedureRuns, useProcedures, useRemoveProcedure } from "./useTeamStandards";
import type { Procedure } from "./types";

export function TeamStandardsPage() {
  const { profile } = useAuth();
  const { data: procedures, isLoading: loadingProcedures } = useProcedures();
  const { data: runs, isLoading: loadingRuns } = useProcedureRuns();
  const { data: users } = useUsers();
  const { data: tasks } = useTasks();
  const removeProcedure = useRemoveProcedure();
  const [editing, setEditing] = useState<Procedure | null | "new">(null);
  const [startingIn, setStartingIn] = useState<Procedure | null>(null);
  const admin = isAdmin(profile);

  if (loadingProcedures || loadingRuns) return <div className="empty">Carregando padrões da equipe…</div>;

  const procs = procedures ?? [];
  const activeRuns = (runs ?? []).filter((r) => r.status === "active");
  const taskById = new Map((tasks ?? []).map((t) => [t.id, t]));

  return (
    <div>
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>
          <span className="msi">checklist</span> Padrões da equipe <span className="count">{procs.length} procedimento(s)</span>
        </div>
        <span style={{ flex: 1 }} />
        {admin && <button className="btn primary sm" onClick={() => setEditing("new")}>+ Novo procedimento</button>}
      </div>

      {procs.length === 0 ? (
        <div className="empty">
          <div className="big msi">checklist</div>
          Nenhum procedimento padrão cadastrado.
          {admin && <div>Clique em <b>+ Novo procedimento</b> para começar.</div>}
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {procs.map((proc) => (
            <div key={proc.id} className="card card-pad">
              <b style={{ fontSize: 15 }}>{proc.name}</b>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{proc.description || "Sem descrição"}</p>
              <p className="hint" style={{ marginTop: 8 }}>
                {proc.steps.length} etapa(s): {proc.steps.map((s) => s.title || "(sem título)").join(" → ")}
              </p>
              <div className="row" style={{ marginTop: 10, gap: 6 }}>
                <button className="btn sm primary" onClick={() => setStartingIn(proc)}>Iniciar</button>
                {admin && (
                  <>
                    <button className="btn sm ghost" onClick={() => setEditing(proc)}>Editar</button>
                    <button className="btn sm danger" onClick={() => removeProcedure.mutate(proc.id)}>Excluir</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section-title" style={{ marginTop: 24 }}>
        <span className="msi">play_arrow</span> Execuções em andamento <span className="count">{activeRuns.length}</span>
      </div>
      {activeRuns.length === 0 ? (
        <div className="hint">Nenhum procedimento em andamento no momento.</div>
      ) : (
        <div className="tbl-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Procedimento</th>
                <th>Referente a</th>
                <th>Etapa atual</th>
                <th>Responsável</th>
                <th>Prazo</th>
              </tr>
            </thead>
            <tbody>
              {activeRuns.map((run) => {
                const proc = procs.find((p) => p.id === run.procedureId);
                const step = proc?.steps[run.currentStepIndex];
                const currentTaskId = run.taskIds[run.currentStepIndex];
                const currentTask = currentTaskId ? taskById.get(currentTaskId) : undefined;
                return (
                  <tr key={run.id}>
                    <td>{proc?.name ?? "—"}</td>
                    <td>{run.label}</td>
                    <td>Etapa {run.currentStepIndex + 1} de {proc?.steps.length ?? "?"} — {step?.title ?? "—"}</td>
                    <td>{userName(users, step?.responsibleId ?? null)}</td>
                    <td>{currentTask ? fmtDate(currentTask.dueDate) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && <ProcedureModal procedure={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {startingIn && <StartRunModal procedure={startingIn} onClose={() => setStartingIn(null)} />}
    </div>
  );
}
