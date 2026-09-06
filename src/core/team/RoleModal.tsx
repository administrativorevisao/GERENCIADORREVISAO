import { useState } from "react";
import { NAV } from "../../shared/layout/nav";
import { useUsers } from "./useUsers";
import { useSaveRole, type Role } from "./roles";

const TOGGLABLE_VIEWS = NAV.filter((n) => !["profile", "admin", "financeiro"].includes(n.id));

export function RoleModal({ role, onClose }: { role: Role | null; onClose: () => void }) {
  const { data: users } = useUsers();
  const saveRole = useSaveRole();
  const [name, setName] = useState(role?.name ?? "");
  const [isAdmin, setIsAdmin] = useState(role?.isAdmin ?? false);
  const [financeAccess, setFinanceAccess] = useState(role?.financeAccess ?? false);
  const [fullViews, setFullViews] = useState(role ? role.allowedViews === null : true);
  const [views, setViews] = useState<Set<string>>(new Set(role?.allowedViews ?? TOGGLABLE_VIEWS.map((n) => n.id)));

  function toggleView(id: string) {
    setViews((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!name.trim()) return;
    await saveRole.mutateAsync({
      role: {
        name: name.trim(),
        isAdmin,
        financeAccess,
        allowedViews: isAdmin || fullViews ? null : Array.from(views),
      },
      existing: role ?? undefined,
      users: users ?? [],
    });
    onClose();
  }

  const usedByCount = role ? (users ?? []).filter((u) => u.roleId === role.id).length : 0;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{role ? "Editar perfil de acesso" : "Novo perfil de acesso"}</h3></div>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="role-name">Nome do perfil</label>
            <input id="role-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ex: Gestor de Projetos" />
          </div>

          <label className="row" style={{ alignItems: "center", gap: 8, marginTop: 12 }}>
            <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
            <span><b>Acesso total (Admin)</b> — vê e edita tudo no sistema, inclusive Administração e permissões de outros usuários.</span>
          </label>

          {!isAdmin && (
            <>
              <label className="row" style={{ alignItems: "center", gap: 8, marginTop: 10 }}>
                <input type="checkbox" checked={financeAccess} onChange={(e) => setFinanceAccess(e.target.checked)} />
                <span><b>Acesso ao Financeiro</b> — edição completa do módulo Financeiro (sigiloso; só quem marcar isso ou for Admin enxerga).</span>
              </label>

              <label className="row" style={{ alignItems: "center", gap: 8, marginTop: 10 }}>
                <input type="checkbox" checked={fullViews} onChange={(e) => setFullViews(e.target.checked)} />
                <span><b>Acesso a todas as visualizações</b> (Dashboard, Calendário, Projetos, Setores etc.)</span>
              </label>

              {!fullViews && (
                <div className="field" style={{ marginTop: 8 }}>
                  <label>Visualizações permitidas</label>
                  <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 6 }}>
                    {TOGGLABLE_VIEWS.map((n) => (
                      <label key={n.id} className="row" style={{ alignItems: "center", gap: 6, fontSize: 13 }}>
                        <input type="checkbox" checked={views.has(n.id)} onChange={() => toggleView(n.id)} />
                        {n.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {role && (
            <p className="hint" style={{ marginTop: 12 }}>
              {usedByCount > 0
                ? `Aplicado a ${usedByCount} colaborador(es). Salvar aqui atualiza as permissões de todos eles imediatamente.`
                : "Nenhum colaborador usa este perfil ainda — atribua em Equipe."}
            </p>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={saveRole.isPending || !name.trim()}>
            {saveRole.isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
