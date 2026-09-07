// Procedimentos Padrão da equipe: um roteiro de etapas em ordem fixa, cada
// uma com um responsável definido. Ao concluir a tarefa de uma etapa, a
// tarefa da etapa seguinte é criada e atribuída automaticamente — ver
// advanceProcedureRun em api.ts, disparado a partir de core/tasks/api.ts.
export interface ProcedureStep {
  id: string;
  title: string;
  description: string;
  responsibleId: string | null; // TeamUser.id — quem sempre executa esta etapa
  daysToComplete: number | null; // prazo em dias corridos a partir do início da etapa
}

export interface Procedure {
  id: string;
  name: string;
  description: string;
  steps: ProcedureStep[];
  active: boolean;
  createdAt: string;
}

export type ProcedureRunStatus = "active" | "done" | "cancelled";

export interface ProcedureRun {
  id: string;
  procedureId: string;
  label: string; // identifica esta execução (ex: nome do curso/projeto ao qual se refere)
  status: ProcedureRunStatus;
  currentStepIndex: number;
  taskIds: (string | null)[]; // uma entrada por etapa, na mesma ordem de Procedure.steps
  startedAt: string;
  startedBy: string | null;
}
