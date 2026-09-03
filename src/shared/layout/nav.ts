export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string; // nome do glifo Material Symbols
  group?: string;
  adminOnly?: boolean;
}

// Espelha o array NAV do index.html original — mesma ordem/rotulagem,
// agora mapeado para rotas do React Router em vez de State.view.
export const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", path: "/", icon: "bar_chart" },
  { id: "calendar", label: "Calendário", path: "/calendario", icon: "calendar_month", group: "Visualizações" },
  { id: "projects", label: "Projetos", path: "/projetos", icon: "folder" },
  { id: "tasks", label: "Tarefas", path: "/tarefas", icon: "task_alt" },
  { id: "meetings", label: "Reuniões", path: "/reunioes", icon: "groups" },
  { id: "pedagogico", label: "Pedagógico", path: "/pedagogico", icon: "school", group: "Setores" },
  { id: "comercial", label: "Comercial", path: "/comercial", icon: "handshake" },
  { id: "marketing", label: "Marketing", path: "/marketing", icon: "campaign" },
  { id: "administrativo", label: "Administrativo", path: "/administrativo", icon: "domain" },
  { id: "cs", label: "CS / CX", path: "/cs", icon: "support_agent" },
  { id: "financeiro", label: "Financeiro", path: "/financeiro", icon: "account_balance_wallet", group: "Financeiro" },
  { id: "team", label: "Equipe", path: "/equipe", icon: "group", group: "Gestão" },
  { id: "notifications", label: "Notificações", path: "/notificacoes", icon: "notifications" },
  { id: "admin", label: "Administração", path: "/admin", icon: "settings", adminOnly: true },
  { id: "profile", label: "Perfil", path: "/perfil", icon: "account_circle", group: "Conta" },
];
