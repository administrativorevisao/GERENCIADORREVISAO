import { NavLink } from "react-router-dom";

const ITEMS: { path: string; icon: string; label: string }[] = [
  { path: "/", icon: "bar_chart", label: "Início" },
  { path: "/calendario", icon: "calendar_month", label: "Agenda" },
  { path: "/projetos", icon: "folder", label: "Projetos" },
  { path: "/notificacoes", icon: "notifications", label: "Alertas" },
  { path: "/perfil", icon: "account_circle", label: "Perfil" },
];

export function MobileBar() {
  return (
    <nav className="mobilebar">
      {ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === "/"}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <span className="ico msi">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
