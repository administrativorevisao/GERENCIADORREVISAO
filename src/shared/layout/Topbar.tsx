import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { NAV } from "./nav";

export function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [theme, setTheme] = useThemeToggle();

  const current = NAV.find((n) => n.path === pathname);

  return (
    <header className="topbar">
      <button className="icon-btn hamburger" onClick={onToggleSidebar} aria-label="Menu">
        <span className="msi">menu</span>
      </button>
      <div>
        <h1>{current?.label ?? "RevisãoOS"}</h1>
      </div>
      <div className="topbar-spacer" />
      <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Alternar tema">
        <span className="msi">{theme === "dark" ? "light_mode" : "dark_mode"}</span>
      </button>
      <button className="icon-btn" onClick={() => navigate("/notificacoes")} aria-label="Notificações">
        <span className="msi">notifications</span>
      </button>
      <button className="user-chip" onClick={() => navigate("/perfil")}>
        <span className="avatar">{profile?.shortName?.[0]?.toUpperCase() ?? "?"}</span>
        <span className="who">
          <b>{profile?.shortName}</b>
          <span>{profile?.role === "admin" ? "Administrador" : profile?.jobTitle || "Colaborador"}</span>
        </span>
      </button>
      <button className="icon-btn" onClick={() => void signOut()} title="Sair" aria-label="Sair">
        <span className="msi">logout</span>
      </button>
    </header>
  );
}

function useThemeToggle() {
  const key = "revisionOS_theme";
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem(key) as "light" | "dark") ?? "light",
  );
  useEffect(() => {
    localStorage.setItem(key, theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return [theme, setTheme] as const;
}
