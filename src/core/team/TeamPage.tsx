import { useState } from "react";
import { useAuth } from "../../shared/auth/AuthContext";
import { isAdmin } from "../../shared/auth/types";
import { STANDARD_DEPARTMENTS } from "../companies/companies";
import { useAssignRole, useRoles } from "./roles";
import { downloadTeamTemplate } from "./teamTemplate";
import { TeamImportModal } from "./TeamImportModal";
import { TeamMemberModal } from "./TeamMemberModal";
import type { TeamUser } from "./types";
import { useUsers } from "./useUsers";

function departmentName(id: string | null): string {
  if (!id) return "—";
  return STANDARD_DEPARTMENTS.find((d) => d.id === id)?.name ?? "—";
}

export function TeamPage() {
  const { profile } = useAuth();
  const { data: users, isLoading, refetch } = useUsers();
  const { data: roles } = useRoles();
  const assignRole = useAssignRole();
  const [importing, setImporting] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamUser | null | "new">(null);
  const admin = isAdmin(profile);

  async function handleAssignRole(user: TeamUser, roleId: string) {
    const role = (roles ?? []).find((r) => r.id === roleId) ?? null;
    try {
      await assignRole.mutateAsync({ user, role });
    } catch (e) {
      alert((e as Error).message || "Não foi possível atribuir esse perfil.");
    }
  }

  if (isLoading) return <div className="empty">Carregando equipe…</div>;

  const list = (users ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="toolbar">
        <div className="section-title" style={{ margin: 0 }}>
          <span className="msi">group</span> Equipe <span className="count">{list.length}</span>
        </div>
        <span style={{ flex: 1 }} />
        {admin && (
          <>
            <button className="btn sm ghost" onClick={downloadTeamTemplate}>Modelo</button>
            <button className="btn sm" onClick={() => setImporting(true)}>
              <span className="msi">folder_open</span> Importar do Drive
            </button>
            <button className="btn sm primary" onClick={() => setEditingUser("new")}>+ Novo colaborador</button>
          </>
        )}
      </div>

      {list.length === 0 ? (
        <div className="empty">Nenhum colaborador cadastrado ainda.</div>
      ) : (
        <div className="tbl-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Cargo</th>
                <th>Setor</th>
                <th>Papel</th>
                <th>Perfil de acesso</th>
                {admin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="row" style={{ alignItems: "center", gap: 8 }}>
                      {u.avatarImage ? (
                        <img src={u.avatarImage} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <span className="msi" style={{ fontSize: 20 }}>account_circle</span>
                      )}
                      {u.name || u.shortName || "—"}
                    </div>
                  </td>
                  <td>{u.email || "—"}</td>
                  <td>{u.jobTitle || "—"}</td>
                  <td>{departmentName(u.departmentId)}</td>
                  <td>{u.role === "admin" ? "Admin" : "Colaborador"}</td>
                  <td>
                    {admin ? (
                      <select
                        className="input" style={{ padding: "4px 8px", fontSize: 12.5 }}
                        value={u.roleId ?? ""} onChange={(e) => handleAssignRole(u, e.target.value)}
                      >
                        <option value="">— Nenhum —</option>
                        {(roles ?? []).map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    ) : (
                      (roles ?? []).find((r) => r.id === u.roleId)?.name ?? "—"
                    )}
                  </td>
                  {admin && (
                    <td>
                      <button className="btn sm ghost" onClick={() => setEditingUser(u)}>Editar</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {importing && (
        <TeamImportModal users={list} onClose={() => setImporting(false)} onDone={() => refetch()} />
      )}
      {editingUser && (
        <TeamMemberModal user={editingUser === "new" ? null : editingUser} onClose={() => setEditingUser(null)} />
      )}
    </div>
  );
}
