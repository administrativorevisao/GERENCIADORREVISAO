import { useState } from "react";
import { useAuth } from "../../shared/auth/AuthContext";
import { isAdmin } from "../../shared/auth/types";
import { DashboardView } from "./DashboardView";
import { FluxoCaixaView } from "./FluxoCaixaView";
import { ContasView } from "./ContasView";
import { FaturamentoView } from "./FaturamentoView";
import { ContasBancariasView } from "./ContasBancariasView";
import { FolhaView } from "./FolhaView";
import { NFsContratadosView } from "./NFsContratadosView";
import { MetasView } from "./MetasView";
import { DREView } from "./DREView";
import { FIN_VIEWS, type FinViewId } from "./types";

// Financeiro é sigiloso: só admin ou colaboradores com financeAccess=true
// veem qualquer coisa aqui — mesma regra do app original (Perm.canView).
export function FinanceiroPage() {
  const { profile } = useAuth();
  const [view, setView] = useState<FinViewId>("dashboard");

  if (!isAdmin(profile) && !profile?.financeAccess) {
    return (
      <div className="empty">
        <div className="big msi">lock</div>
        Acesso restrito a colaboradores autorizados.
      </div>
    );
  }

  return (
    <div>
      <div className="seg" style={{ marginBottom: 18, flexWrap: "wrap" }}>
        {FIN_VIEWS.map((v) => (
          <button key={v.id} className={view === v.id ? "on" : ""} onClick={() => setView(v.id)}>{v.label}</button>
        ))}
      </div>
      {view === "dashboard" && <DashboardView />}
      {view === "fluxoCaixa" && <FluxoCaixaView />}
      {view === "contas" && <ContasView />}
      {view === "faturamento" && <FaturamentoView />}
      {view === "contasBancarias" && <ContasBancariasView />}
      {view === "folha" && <FolhaView />}
      {view === "nfsContratados" && <NFsContratadosView />}
      {view === "metas" && <MetasView />}
      {view === "dre" && <DREView />}
    </div>
  );
}
