import { useAuth } from "../../shared/auth/AuthContext";

export function DashboardPage() {
  const { profile } = useAuth();
  return (
    <div>
      <div className="section-title">Olá, {profile?.shortName ?? "colaborador"} 👋</div>
      <div className="kpis">
        <div className="kpi">
          <div className="lab">Tarefas hoje</div>
          <div className="val">—</div>
        </div>
        <div className="kpi">
          <div className="lab">Projetos ativos</div>
          <div className="val">—</div>
        </div>
        <div className="kpi">
          <div className="lab">Notificações</div>
          <div className="val">—</div>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 20 }}>
        Dashboard será portado do RevisãoOS original na Fase 1 (dados reais via Supabase).
      </p>
    </div>
  );
}
