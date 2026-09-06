import { useState } from "react";
import { useAuth } from "../../shared/auth/AuthContext";
import { isAdmin } from "../../shared/auth/types";
import { STANDARD_DEPARTMENTS } from "../companies/companies";
import { downloadTeamTemplate } from "./teamTemplate";
import { TeamImportModal } from "./TeamImportModal";
import { useUsers } from "./useUsers";

function departmentName(id: string | null): string {
  if (!id) return "—";
  return STANDARD_DEPARTMENTS.find((d) => d.id === id)?.name ?? "—";
}

export function TeamPage() {
  const { profile } = useAuth();
  const { data: users, isLoading, refetch } = useUsers();
  const [importing, setImporting] = useState(false);
  const admin = isAdmin(profile);

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
            <button className="btn sm primary" onClick={() => setImporting(true)}>
              <span className="msi">folder_open</span> Importar do Drive
            </button>
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
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td>{u.name || u.shortName || "—"}</td>
                  <td>{u.email || "—"}</td>
                  <td>{u.jobTitle || "—"}</td>
                  <td>{departmentName(u.departmentId)}</td>
                  <td>{u.role === "admin" ? "Admin" : "Colaborador"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {importing && (
        <TeamImportModal users={list} onClose={() => setImporting(false)} onDone={() => refetch()} />
      )}
    </div>
  );
}
