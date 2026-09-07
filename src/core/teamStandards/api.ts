import { createRow, getRow, listRows, newId, removeRow, updateRow } from "../../shared/lib/jsonStore";
import { addDaysISO, todayISO } from "../../shared/lib/dates";
import { supabase } from "../../shared/lib/supabaseClient";
import { createTask } from "../tasks/api";
import type { Procedure, ProcedureRun, ProcedureStep } from "./types";

const PROCEDURES_TABLE = "procedures";
const RUNS_TABLE = "procedure_runs";

export function listProcedures(companyId: string) {
  return listRows<Procedure>(PROCEDURES_TABLE, companyId);
}

export function createProcedure(companyId: string, input: Partial<Procedure>) {
  const procedure: Procedure = {
    id: newId("proc"),
    name: "",
    description: "",
    steps: [],
    active: true,
    createdAt: new Date().toISOString(),
    ...input,
  };
  return createRow(PROCEDURES_TABLE, companyId, procedure);
}

export function updateProcedure(procedure: Procedure) {
  return updateRow(PROCEDURES_TABLE, procedure);
}

export function removeProcedure(id: string) {
  return removeRow(PROCEDURES_TABLE, id);
}

export function listProcedureRuns(companyId: string) {
  return listRows<ProcedureRun>(RUNS_TABLE, companyId);
}

function taskInputForStep(step: ProcedureStep, procedure: Procedure, run: ProcedureRun, stepIndex: number) {
  return {
    title: `${step.title} — ${run.label}`,
    description: step.description || `Etapa ${stepIndex + 1} de ${procedure.steps.length} do procedimento "${procedure.name}".`,
    type: "procedure_step" as const,
    responsibleId: step.responsibleId,
    dueDate: step.daysToComplete != null ? addDaysISO(todayISO(), step.daysToComplete) : todayISO(),
    procedureRunId: run.id,
    procedureStepIndex: stepIndex,
  };
}

// Começa uma execução do procedimento: cria a tarefa da primeira etapa,
// já atribuída ao responsável definido para ela.
export async function startProcedureRun(companyId: string, procedure: Procedure, label: string, startedBy: string | null): Promise<ProcedureRun> {
  const run: ProcedureRun = {
    id: newId("run"),
    procedureId: procedure.id,
    label,
    status: "active",
    currentStepIndex: 0,
    taskIds: procedure.steps.map(() => null),
    startedAt: new Date().toISOString(),
    startedBy,
  };
  const saved = await createRow(RUNS_TABLE, companyId, run);

  if (procedure.steps.length === 0) return saved;
  const firstTask = await createTask(companyId, taskInputForStep(procedure.steps[0], procedure, saved, 0), startedBy ?? "");
  saved.taskIds[0] = firstTask.id;
  return updateRow(RUNS_TABLE, saved);
}

// Chamado a partir de core/tasks/api.ts sempre que uma tarefa vinculada a
// uma execução de procedimento é marcada como concluída: cria a tarefa da
// próxima etapa (já atribuída a quem for responsável por ela) ou, se a
// etapa concluída era a última, marca a execução como concluída.
export async function advanceProcedureRun(runId: string): Promise<void> {
  const run = await getRow<ProcedureRun>(RUNS_TABLE, runId);
  if (!run || run.status !== "active") return;
  const procedure = await getRow<Procedure>(PROCEDURES_TABLE, run.procedureId);
  if (!procedure) return;

  const nextIndex = run.currentStepIndex + 1;
  if (nextIndex >= procedure.steps.length) {
    await updateRow(RUNS_TABLE, { ...run, status: "done" as const, currentStepIndex: nextIndex });
    return;
  }

  const nextTask = await createTask(
    // company_id não está no ProcedureRun — mas createTask só precisa dele para o insert;
    // como as tarefas de uma execução sempre pertencem à mesma empresa do procedimento,
    // reaproveitamos o company_id já resolvido pela RLS ao ler `procedure` (linha só é
    // legível pela própria empresa) — buscado explicitamente abaixo.
    await companyIdOf(procedure.id),
    taskInputForStep(procedure.steps[nextIndex], procedure, run, nextIndex),
    procedure.steps[nextIndex].responsibleId ?? "",
  );

  const taskIds = [...run.taskIds];
  taskIds[nextIndex] = nextTask.id;
  await updateRow(RUNS_TABLE, { ...run, currentStepIndex: nextIndex, taskIds });
}

// Pequeno helper: descobre a empresa de um procedimento lendo a coluna
// company_id diretamente (getRow só devolve o "data"; aqui precisamos da
// coluna de fora do jsonb para poder criar a próxima tarefa na empresa certa).
async function companyIdOf(procedureId: string): Promise<string> {
  if (!supabase) throw new Error("Supabase não configurado.");
  const { data, error } = await supabase.from(PROCEDURES_TABLE).select("company_id").eq("id", procedureId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Procedimento não encontrado.");
  return data.company_id as string;
}
