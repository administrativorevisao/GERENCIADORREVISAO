import { useState } from "react";
import { STANDARD_DEPARTMENTS } from "../companies/companies";
import { fmtDate } from "../../shared/lib/dates";
import { MeetingModal } from "./MeetingModal";
import { useMeetings } from "./useMeetings";

function deptName(id: string | null): string {
  return STANDARD_DEPARTMENTS.find((d) => d.id === id)?.name ?? "—";
}

export function MeetingsPage() {
  const { data: meetings, isLoading, error } = useMeetings();
  const [creating, setCreating] = useState(false);

  if (isLoading) return <div className="empty">Carregando reuniões…</div>;
  if (error) return <div className="empty">Erro ao carregar reuniões: {(error as Error).message}</div>;

  const list = (meetings ?? []).slice().sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>
          <span className="msi">groups</span> Reuniões <span className="count">{list.length}</span>
        </div>
        <span style={{ flex: 1 }} />
        <button className="btn primary sm" onClick={() => setCreating(true)}>+ Nova reunião</button>
      </div>

      {list.length === 0 && (
        <div className="empty">
          <div className="big msi">groups</div>
          Nenhuma reunião registrada ainda.
        </div>
      )}

      {list.map((meeting) => (
        <div className="card card-pad" key={meeting.id} style={{ marginBottom: 10 }}>
          <div className="row" style={{ alignItems: "center" }}>
            <div className="stack">
              <b>{meeting.title}</b>
              <span className="muted" style={{ fontSize: 12 }}>{deptName(meeting.departmentId)} · {fmtDate(meeting.date)}</span>
            </div>
            {meeting.recordingUrl && (
              <a href={meeting.recordingUrl} target="_blank" rel="noreferrer" className="btn sm ghost" style={{ marginLeft: "auto" }}>
                <span className="msi">videocam</span> Gravação
              </a>
            )}
          </div>
          {meeting.decisions && <p style={{ fontSize: 13, marginTop: 8, whiteSpace: "pre-wrap" }}>{meeting.decisions}</p>}
        </div>
      ))}

      {creating && <MeetingModal onClose={() => setCreating(false)} />}
    </div>
  );
}
