import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./shared/auth/AuthContext";
import { LoginPage } from "./shared/auth/LoginPage";
import { ProfilePage } from "./shared/auth/ProfilePage";
import { AppLayout } from "./shared/layout/AppLayout";
import { AdminPage } from "./shared/admin/AdminPage";
import { DashboardPage } from "./core/dashboard/DashboardPage";
import { ProjectsPage } from "./core/projects/ProjectsPage";
import { ProjectDetailPage } from "./core/projects/ProjectDetailPage";
import { TasksPage } from "./core/tasks/TasksPage";
import { ProcessCenterPage } from "./core/tasks/ProcessCenterPage";
import { CalendarPage } from "./core/calendar/CalendarPage";
import { MeetingsPage } from "./core/meetings/MeetingsPage";
import { NotificationsPage } from "./core/notifications/NotificationsPage";
import { TeamPage } from "./core/team/TeamPage";
import { TeamStandardsPage } from "./core/teamStandards/TeamStandardsPage";
import { PedagogicoPage } from "./modules/pedagogico/PedagogicoPage";
import { ComercialPage } from "./modules/comercial/ComercialPage";
import { MarketingPage } from "./modules/marketing/MarketingPage";
import { AdministrativoPage } from "./modules/administrativo/AdministrativoPage";
import { CsPage } from "./modules/cs/CsPage";
import { FinanceiroPage } from "./modules/financeiro/FinanceiroPage";
import { isAdmin } from "./shared/auth/types";

export default function App() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="empty" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        Carregando RevisãoOS…
      </div>
    );
  }

  if (!session || !profile) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/calendario" element={<CalendarPage />} />
        <Route path="/projetos" element={<ProjectsPage />} />
        <Route path="/projetos/:id" element={<ProjectDetailPage />} />
        <Route path="/tarefas" element={<TasksPage />} />
        <Route path="/processos" element={<ProcessCenterPage />} />
        <Route path="/reunioes" element={<MeetingsPage />} />
        <Route path="/pedagogico" element={<PedagogicoPage />} />
        <Route path="/comercial" element={<ComercialPage />} />
        <Route path="/marketing" element={<MarketingPage />} />
        <Route path="/administrativo" element={<AdministrativoPage />} />
        <Route path="/cs" element={<CsPage />} />
        <Route path="/financeiro" element={<FinanceiroPage />} />
        <Route path="/equipe" element={<TeamPage />} />
        <Route path="/padroes-da-equipe" element={<TeamStandardsPage />} />
        <Route path="/notificacoes" element={<NotificationsPage />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route
          path="/admin"
          element={isAdmin(profile) ? <AdminPage /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
