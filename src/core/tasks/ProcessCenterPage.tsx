import { useState } from "react";
import { useAuth } from "../../shared/auth/AuthContext";
import { isAdmin } from "../../shared/auth/types";
import { STANDARD_DEPARTMENTS } from "../companies/companies";
import { PROGRAM_COLORS } from "../projects/types";
import { userName, useUsers } from "../team/useUsers";
import { useTasks, useUpdateTaskStatus } from "./useTasks";
import { STATUS_LABEL, STATUSES, type TaskStatus } from "./types";
import { dueStatus, fmtDate } from "../../shared/lib/dates";
import { ProcessModal } from "./ProcessModal";

export function ProcessCenterPage() {
  const { profile } = useAuth();
  const { data: tasks, isLoading } = useTasks();
  const { data: users } = useUsers();
  const updateStatus = useUpdateTaskStatus();
  const [creatingIn, setCreatingIn] = useState<string | null | "new">(null);

  if (isLoading) return <div className="empty">Carregando processos…</div>;

  const admin = isAdmin(profile);
  const depts = admin ? STANDARD_DEPARTMENTS : STANDARD_DEPARTMENTS.filter((d) => d.id === profile?.departmentId);
  const processes = (tasks ?? []).filter((t) => t.type === "process");

  return (
    <div>
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>
          <span className="msi">inventory_2</span> Central de Processos <span className="count">{processes.length} demanda(s) · {depts.length} setor(es)</span>
        </div>
        <span style={{ flex: 1 }} />
        <button className="btn primary sm" onClick={() => setCreatingIn("new")}>+ Nova demanda</button>
      </div>

      {depts.map((d, i) => {
        const items = processes.filter((t) => t.departmentId === d.id);
        const done = items.filter((t) => t.status === "done").length;
        const percent = items.length ? Math.round((done / items.length) * 100) : 0;
        const color = PROGRAM_COLORS[i % PROGRAM_COLORS.length];
        return (
          <div className="card card-pad" key={d.id} style={{ marginBottom: 14, borderLeft: `4px solid ${color}` }}>
            <div className="row" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, display: "grid", placeItems: "center", fontSize: 19, background: `color-mix(in srgb, ${color} 16%, transparent)` }}>{d.icon}</div>
              <div className="stack">
                <b style={{ fontSize: 15 }}>{d.name}</b>
                <span className="muted" style={{ fontSize: 12 }}>{items.length} demanda(s) · {done} concluída(s)</span>
              </div>
              <button className="btn sm primary" style={{ marginLeft: "auto" }} onClick={() => setCreatingIn(d.id)}>+ Demanda</button>
            </div>
            {items.length > 0 && (
              <div className="progress" style={{ marginTop: 10 }}><span style={{ width: `${percent}%`, background: color }} /></div>
            )}
            <div style={{ marginTop: items.length ? 8 : 0 }}>
              {items.length === 0 && <div className="hint">Nenhuma demanda neste setor. Clique em <b>+ Demanda</b> para criar.</div>}
              {items.map((t) => (
                <div className="list-item" key={t.id}>
                  <div className="stack" style={{ flex: 1 }}>
                    <b style={{ fontSize: 13.5 }}>{t.title}</b>
                    <span className="muted" style={{ fontSize: 11.5 }}>{userName(users, t.responsibleId)}</span>
                  </div>
                  <select
                    className="input" style={{ padding: "4px 8px", fontSize: 12.5, width: "auto" }}
                    value={t.status}
                    onChange={(e) => updateStatus.mutate({ task: t, status: e.target.value as TaskStatus })}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                  <span className={`badge b-${dueStatus(t.dueDate, t.status)}`}>{fmtDate(t.dueDate)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {creatingIn && <ProcessModal defaultDeptId={creatingIn === "new" ? undefined : creatingIn} onClose={() => setCreatingIn(null)} />}
    </div>
  );
}
