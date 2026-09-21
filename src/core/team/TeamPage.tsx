import { useState } from "react";
import { useAuth } from "../../shared/auth/AuthContext";
import { isAdmin } from "../../shared/auth/types";
import { STANDARD_DEPARTMENTS } from "../companies/companies";
import { Avatar } from "../../shared/ui/Avatar";
import { useAssignRole, useRoles } from "./roles";
import { downloadTeamTemplate } from "./teamTemplate";
import { TeamImportModal } from "./TeamImportModal";
import { TeamMemberModal } from "./TeamMemberModal";
import type { TeamUser } from "./types";
import { useDeleteUser, useUpdateUser, useUsers } from "./useUsers";

function departmentName(id: string | null): string {
  if (!id) return "—";
  return STANDARD_DEPARTMENTS.find((d) => d.id === id)?.name ?? "—";
}

export function TeamPage() {
  const { profile } = useAuth();
  const { data: users, isLoading, refetch } = useUsers();
  const { data: roles } = useRoles();
  const assignRole = useAssignRole();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const [importing, setImporting] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamUser | null | "new">(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
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
  const selectedUsers = list.filter((u) => selected.has(u.id));
  const allSelected = list.length > 0 && selectedUsers.length === list.length;

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => (prev.size === list.length ? new Set() : new Set(list.map((u) => u.id))));
  }

  // Ações em lote sempre tentam todo mundo selecionado e reportam quem falhou
  // no final (ex: mover o único Admin de setor não falha, mas excluí-lo ou
  // trocar o perfil dele pra um sem isAdmin falha pela mesma trava de
  // segurança que já existe pra edição/exclusão individual).
  async function bulkMoveDepartment(departmentId: string) {
    setBulkBusy(true);
    const results = await Promise.allSettled(
      selectedUsers.map((u) => updateUser.mutateAsync({ ...u, departmentId: departmentId || null })),
    );
    setBulkBusy(false);
    reportBulkResult(results, "mover de setor");
  }

  async function bulkAssignRole(roleId: string) {
    const role = (roles ?? []).find((r) => r.id === roleId) ?? null;
    setBulkBusy(true);
    const results = await Promise.allSettled(
      selectedUsers.map((u) => assignRole.mutateAsync({ user: u, role })),
    );
    setBulkBusy(false);
    reportBulkResult(results, "alterar o perfil de acesso");
  }

  async function bulkDelete() {
    const ok = window.confirm(
      `Excluir ${selectedUsers.length} colaborador(es) selecionado(s)? Essa ação não pode ser desfeita.`,
    );
    if (!ok) return;
    setBulkBusy(true);
    const results = await Promise.allSettled(selectedUsers.map((u) => deleteUser.mutateAsync(u.id)));
    setBulkBusy(false);
    reportBulkResult(results, "excluir");
    setSelected(new Set());
  }

  function reportBulkResult(results: PromiseSettledResult<unknown>[], action: string) {
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    if (failed.length > 0) {
      const messages = failed.map((f) => (f.reason as Error)?.message || "erro desconhecido");
      alert(`Não foi possível ${action} para ${failed.length} de ${results.length} colaborador(es):\n\n${messages.join("\n")}`);
    }
  }

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

      {admin && selected.size > 0 && (
        <div className="card card-pad" style={{ marginBottom: 14, borderLeft: "4px solid var(--accent, #6d28d9)" }}>
          <div className="row" style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <b style={{ fontSize: 13.5 }}>{selected.size} selecionado(s)</b>
            <select
              className="input" style={{ width: "auto" }} disabled={bulkBusy} value="__placeholder__"
              onChange={(e) => { if (e.target.value !== "__placeholder__") bulkMoveDepartment(e.target.value); }}
            >
              <option value="__placeholder__" disabled>Mover para setor…</option>
              <option value="">— Nenhum —</option>
              {STANDARD_DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
            </select>
            <select
              className="input" style={{ width: "auto" }} disabled={bulkBusy} value="__placeholder__"
              onChange={(e) => { if (e.target.value !== "__placeholder__") bulkAssignRole(e.target.value); }}
            >
              <option value="__placeholder__" disabled>Alterar perfil de acesso…</option>
              <option value="">— Nenhum —</option>
              {(roles ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button className="btn sm" style={{ borderColor: "var(--danger, #d33)", color: "var(--danger, #d33)" }} onClick={bulkDelete} disabled={bulkBusy}>
              Excluir selecionados
            </button>
            <span style={{ flex: 1 }} />
            <button className="btn sm ghost" onClick={() => setSelected(new Set())} disabled={bulkBusy}>Limpar seleção</button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="empty">Nenhum colaborador cadastrado ainda.</div>
      ) : (
        <div className="tbl-wrap">
          <table className="data">
            <thead>
              <tr>
                {admin && (
                  <th>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Selecionar todos" />
                  </th>
                )}
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
                  {admin && (
                    <td>
                      <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleOne(u.id)} aria-label={`Selecionar ${u.name}`} />
                    </td>
                  )}
                  <td>
                    <div className="row" style={{ alignItems: "center", gap: 8 }}>
                      <Avatar name={u.shortName || u.name} image={u.avatarImage} size="sm" />
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
