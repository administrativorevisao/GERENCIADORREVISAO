import { NavLink } from "react-router-dom";
import { useCompany } from "../../core/companies/CompanyContext";
import { useAuth } from "../auth/AuthContext";
import { canView, isAdmin } from "../auth/types";
import { NAV } from "./nav";

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { company, companies, setCompanyId } = useCompany();
  const { profile } = useAuth();

  let lastGroup: string | undefined;

  return (
    <>
      <div className={`scrim ${open ? "show" : ""}`} onClick={onClose} />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-logo">{company.initials}</div>
          <div className="brand-txt">
            <b>{company.name}OS</b>
            <span>{company.sub}</span>
          </div>
        </div>
        <div className="company-switch">
          {companies.map((c) => (
            <button
              key={c.id}
              className={`company-pill ${c.id === company.id ? "active" : ""}`}
              style={{ ["--co" as string]: c.accent }}
              onClick={() => setCompanyId(c.id)}
              title={c.name}
            >
              {c.initials}
            </button>
          ))}
        </div>
        <nav className="nav">
          {NAV.filter((n) => !n.adminOnly || isAdmin(profile))
            .filter((n) => canView(profile, n.id))
            .map((n) => {
              const showGroup = n.group && n.group !== lastGroup;
              lastGroup = n.group;
              return (
                <div key={n.id}>
                  {showGroup && <div className="nav-group-label">{n.group}</div>}
                  <NavLink
                    to={n.path}
                    end={n.path === "/"}
                    className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                  >
                    <span className="ico msi">{n.icon}</span>
                    {n.label}
                  </NavLink>
                </div>
              );
            })}
        </nav>
        <div className="nav-foot">{company.name} — Grupo Revisão</div>
      </aside>
    </>
  );
}
