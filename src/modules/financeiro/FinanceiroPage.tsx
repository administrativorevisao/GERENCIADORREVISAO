import { useAuth } from "../../shared/auth/AuthContext";
import { isAdmin } from "../../shared/auth/types";
import { ComingSoon } from "../../shared/ui/ComingSoon";

// Financeiro é sigiloso: só admin ou colaboradores com financeAccess=true
// chegam a ver o placeholder — mesma regra do app original (ver Perm.canView).
export function FinanceiroPage() {
  const { profile } = useAuth();
  if (!isAdmin(profile) && !profile?.financeAccess) {
    return (
      <div className="empty">
        <div className="big msi">lock</div>
        Acesso restrito a colaboradores autorizados.
      </div>
    );
  }
  return <ComingSoon title="Financeiro" />;
}
