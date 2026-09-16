import { useState } from "react";
import { extractGid, extractSheetId, fetchSheetTitleByGid, getGoogleAccessToken, MONTH_TABS_PT, openDrivePicker } from "../../shared/lib/googleSheets";
import { useAppSettings } from "../../core/companies/appSettings";
import { useSaveSheetLink } from "./sheetLinks";
import type { SheetLink } from "./sheetLinks";
import type { FinViewId } from "./types";

export function SheetLinkModal({ view, link, onClose }: { view: FinViewId; link: SheetLink | null; onClose: () => void }) {
  const saveSheetLink = useSaveSheetLink();
  const { data: settings } = useAppSettings();
  const [url, setUrl] = useState(link?.sheetUrl ?? "");
  const [pickedName, setPickedName] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [tabMode, setTabMode] = useState<"first" | "months" | "custom">(
    link?.tabs && link.tabs.join(",") === MONTH_TABS_PT.join(",") ? "months" : link?.tabs?.length ? "custom" : "first",
  );
  const [customTabs, setCustomTabs] = useState(tabMode === "custom" ? (link?.tabs ?? []).join(", ") : "");
  const [error, setError] = useState<string | null>(null);

  async function handlePickFromDrive() {
    setError(null);
    if (!settings?.googleClientId) {
      setError("Configure o Client ID do Google em Administração antes de usar o seletor do Drive.");
      return;
    }
    if (!settings?.googleApiKey) {
      setError("Configure a Chave de API do Google em Administração antes de usar o seletor do Drive.");
      return;
    }
    setPicking(true);
    try {
      const token = await getGoogleAccessToken(settings.googleClientId);
      const picked = await openDrivePicker(settings.googleApiKey, token);
      if (picked) {
        setUrl(picked.url);
        setPickedName(picked.name);
      }
    } catch (e) {
      setError((e as Error).message || "Não foi possível abrir o seletor do Drive.");
    } finally {
      setPicking(false);
    }
  }

  async function handleSave() {
    setError(null);
    const trimmedUrl = url.trim();
    const sheetId = extractSheetId(trimmedUrl);
    if (!sheetId) {
      setError("Não consegui reconhecer o ID da planilha nessa URL. Cole o link completo do Google Sheets.");
      return;
    }
    let tabs = tabMode === "months" ? MONTH_TABS_PT
      : tabMode === "custom" ? customTabs.split(",").map((s) => s.trim()).filter(Boolean)
      : null;
    // Se o link colado aponta pra uma aba específica (tem "gid=" na URL) e o
    // usuário não escolheu outro modo manualmente, sincroniza aquela aba —
    // sem isso, o padrão "Primeira aba" ignorava o gid e lia a aba errada.
    if (tabMode === "first") {
      const gid = extractGid(trimmedUrl);
      if (gid && gid !== "0") {
        if (!settings?.googleClientId) {
          setError("Configure o Client ID do Google em Administração antes de vincular por esse link.");
          return;
        }
        try {
          const title = await fetchSheetTitleByGid(settings.googleClientId, sheetId, gid);
          if (title) tabs = [title];
        } catch (e) {
          setError((e as Error).message || "Não foi possível identificar a aba da planilha pelo link.");
          return;
        }
      }
    }
    await saveSheetLink.mutateAsync({ view, sheetId, sheetUrl: trimmedUrl, tabs, range: "A1:Z2000", existing: link ?? undefined });
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{link ? "Trocar planilha vinculada" : "Vincular planilha do Drive"}</h3></div>
        <div className="modal-body">
          <div className="field">
            <label>Planilha</label>
            <button className="btn" onClick={handlePickFromDrive} disabled={picking} style={{ width: "100%", justifyContent: "center" }}>
              <span className="msi">folder_open</span> {picking ? "Abrindo o Drive…" : "Escolher do Google Drive"}
            </button>
            {pickedName && <p className="hint" style={{ marginTop: 6 }}>Selecionada: <strong>{pickedName}</strong></p>}
          </div>
          <div className="field">
            <label htmlFor="sheet-url">ou cole a URL da planilha (Google Sheets)</label>
            <input
              id="sheet-url" className="input" placeholder="https://docs.google.com/spreadsheets/d/..."
              value={url} onChange={(e) => { setUrl(e.target.value); setPickedName(null); setError(null); }}
            />
          </div>
          <div className="field">
            <label>Quais abas têm os dados?</label>
            <div className="seg">
              <button className={tabMode === "first" ? "on" : ""} onClick={() => setTabMode("first")}>Primeira aba</button>
              <button className={tabMode === "months" ? "on" : ""} onClick={() => setTabMode("months")}>12 meses (JAN–DEZ)</button>
              <button className={tabMode === "custom" ? "on" : ""} onClick={() => setTabMode("custom")}>Nomes específicos</button>
            </div>
          </div>
          {tabMode === "custom" && (
            <div className="field">
              <label htmlFor="sheet-tabs">Nomes das abas, separados por vírgula</label>
              <input id="sheet-tabs" className="input" placeholder="Lançamentos, Extras" value={customTabs} onChange={(e) => setCustomTabs(e.target.value)} />
            </div>
          )}
          {error && <p className="hint" style={{ color: "var(--danger, #d33)" }}>{error}</p>}
          <p className="hint">
            A planilha precisa estar compartilhada com sua conta Google (visualização já é suficiente) e a primeira
            linha de cada aba deve conter os títulos das colunas — baixe o "Modelo" para ver o formato esperado.
          </p>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={saveSheetLink.isPending || !url.trim()}>
            {saveSheetLink.isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
