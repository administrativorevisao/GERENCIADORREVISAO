export interface Meeting {
  id: string;
  departmentId: string | null;
  projectId: string | null;
  title: string;
  date: string;
  recordingUrl: string;
  decisions: string;
  transcript: string;
  createdBy: string | null;
  createdAt: string;
}

export interface ActionItemSuggestion {
  title: string;
  responsibleId: string | null;
  dueDate: string;
}
