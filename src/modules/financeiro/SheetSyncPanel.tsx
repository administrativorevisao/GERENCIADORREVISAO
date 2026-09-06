import { useState } from "react";
import { useCompany } from "../../core/companies/CompanyContext";
import { useUsers } from "../../core/team/useUsers";
import { fetchGoogleSheetRows, fetchGoogleSheetRowsMulti } from "../../shared/lib/googleSheets";
import { useAppSettings } from "../../core/companies/appSettings";
import { fmtDate } from "../../shared/lib/dates";
import { downloadFinanceTemplate, FIN_TEMPLATES } from "./templates";
import { applyFinanceRows, removeFinanceRecordsBySource } from "./importRows";
import { useAccounts } from "./useFinance";
import { useMarkSheetSynced, useSheetLinks } from "./sheetLinks";
import { SheetLinkModal } from "./SheetLinkModal";
import type { FinViewId } from "./types";

export function SheetSyncPanel({ view }: { view: FinViewId }) {
  const { company } = useCompany();
  const { data: settings } = useAppSettings();
  const { data: links } = useSheetLinks();
  const { data: users } = useUsers();
  const { data: accounts } = useAccounts();
  const markSynced = useMarkSheetSynced();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const link = (links ?? []).find((l) => l.view === view) ?? null;
  const hasTemplate = Boolean(FIN_TEMPLATES[view]);
  const clientId = settings?.googleClientId ?? "";

  async function sync() {
    if (!link) {
      setMessage("Vincule uma planilha primeiro.");
      return;
    }
    if (!clientId) {
      setMessage("Configure o Client ID do Google em Administração antes de sincronizar.");
      return;
    }
    setSyncing(true);
    setMessage("Sincronizando com o Google Sheets…");
    try {
      const rows = link.tabs?.length
        ? await fetchGoogleSheetRowsMulti(clientId, link.sheetId, link.tabs)
        : await fetchGoogleSheetRows(clientId, link.sheetId, link.range || "A1:Z2000");
      await removeFinanceRecordsBySource(company.id, view, link.id);
      const n = await applyFinanceRows(company.id, view, rows, users ?? [], accounts ?? [], { sourceSheetLinkId: link.id });
      await markSynced.mutateAsync({ link, count: n });
      setMessage(`${n} registro(s) sincronizado(s) da planilha.`);
    } catch (e) {
      console.error(e);
      setMessage(`Falha ao sincronizar: ${(e as Error).message ?? "erro desconhecido"}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="hint" style={{ marginBottom: 14 }}>
      <div className="row" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span className="msi" style={{ fontSize: 16 }}>link</span>
        {link ? (
          <span style={{ fontSize: 12.5 }}>
            Vinculada{link.lastSyncAt ? ` · última sincronização ${fmtDate(link.lastSyncAt.slice(0, 10))} (${link.lastSyncCount} registro(s))` : " · nunca sincronizada"}
          </span>
        ) : (
          <span className="muted" style={{ fontSize: 12.5 }}>Nenhuma planilha vinculada.</span>
        )}
        <span style={{ flex: 1 }} />
        {hasTemplate && <button className="btn sm ghost" onClick={() => downloadFinanceTemplate(view)}>Modelo</button>}
        <button className="btn sm" onClick={() => setShowLinkModal(true)}>{link ? "Trocar planilha" : "Vincular planilha do Drive"}</button>
        {link && (
          <button className="btn sm primary" onClick={sync} disabled={syncing}>
            {syncing ? "Sincronizando…" : "Sincronizar agora"}
          </button>
        )}
      </div>
      {message && <p className="muted" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>{message}</p>}
      {showLinkModal && <SheetLinkModal view={view} link={link} onClose={() => setShowLinkModal(false)} />}
    </div>
  );
}
