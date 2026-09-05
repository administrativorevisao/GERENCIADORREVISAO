import { useState } from "react";
import { STANDARD_DEPARTMENTS } from "../companies/companies";
import { useUsers, userName } from "../team/useUsers";
import { useCreateTask } from "../tasks/useTasks";
import { useCreateMeeting } from "./useMeetings";
import { extractActionItems } from "./actionItems";
import type { ActionItemSuggestion } from "./types";
import { todayISO } from "../../shared/lib/dates";

export function MeetingModal({ onClose }: { onClose: () => void }) {
  const { data: users } = useUsers();
  const createMeeting = useCreateMeeting();
  const createTask = useCreateTask();

  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [recordingUrl, setRecordingUrl] = useState("");
  const [decisions, setDecisions] = useState("");
  const [transcript, setTranscript] = useState("");
  const [suggestions, setSuggestions] = useState<ActionItemSuggestion[] | null>(null);
  const [createdTitles, setCreatedTitles] = useState<Set<string>>(new Set());

  function analyze() {
    setSuggestions(extractActionItems(transcript, users ?? []));
  }

  async function createTaskFromSuggestion(item: ActionItemSuggestion) {
    await createTask.mutateAsync({
      title: item.title,
      responsibleId: item.responsibleId,
      dueDate: item.dueDate || todayISO(),
      departmentId: departmentId || null,
      type: "standalone",
    });
    setCreatedTitles((prev) => new Set(prev).add(item.title));
  }

  async function handleSave() {
    if (!title.trim()) return;
    await createMeeting.mutateAsync({
      title: title.trim(),
      departmentId: departmentId || null,
      date,
      recordingUrl,
      decisions,
      transcript,
    });
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Nova reunião</h3></div>
        <div className="modal-body">
          <div className="row">
            <div className="field">
              <label htmlFor="mt-title">Título</label>
              <input id="mt-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label htmlFor="mt-dept">Setor</label>
              <select id="mt-dept" className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">— Nenhum —</option>
                {STANDARD_DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="mt-date">Data</label>
              <input id="mt-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="mt-rec">Link da gravação</label>
            <input id="mt-rec" className="input" value={recordingUrl} onChange={(e) => setRecordingUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="field">
            <label htmlFor="mt-dec">Decisões</label>
            <textarea id="mt-dec" className="input" value={decisions} onChange={(e) => setDecisions(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="mt-transcript">Transcrição (cole aqui — opcional)</label>
            <textarea id="mt-transcript" className="input" style={{ minHeight: 120 }} value={transcript} onChange={(e) => setTranscript(e.target.value)} />
            <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={analyze} disabled={!transcript.trim()}>
              <span className="msi">auto_awesome</span> Sugerir itens de ação
            </button>
          </div>

          {suggestions && (
            <div className="hint" style={{ marginTop: 10 }}>
              {suggestions.length === 0 && "Nenhum item de ação reconhecido nessa transcrição."}
              {suggestions.map((item, i) => (
                <div key={i} className="row" style={{ alignItems: "center", padding: "6px 0", borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5 }}>{item.title}</div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      {userName(users, item.responsibleId)} {item.dueDate ? `· ${item.dueDate}` : ""}
                    </div>
                  </div>
                  <button
                    className="btn sm"
                    disabled={createdTitles.has(item.title) || createTask.isPending}
                    onClick={() => createTaskFromSuggestion(item)}
                  >
                    {createdTitles.has(item.title) ? "Criada ✓" : "Criar tarefa"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Fechar</button>
          <button className="btn primary" onClick={handleSave} disabled={createMeeting.isPending || !title.trim()}>
            {createMeeting.isPending ? "Salvando…" : "Salvar reunião"}
          </button>
        </div>
      </div>
    </div>
  );
}
