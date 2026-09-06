import { useState } from "react";
import { useCompany } from "../companies/CompanyContext";
import { useGoogleImport } from "../../shared/lib/useGoogleImport";
import { fetchGoogleSheetRows } from "../../shared/lib/googleSheets";
import { useAppSettings } from "../companies/appSettings";
import { useUsers } from "../team/useUsers";
import { applyProjectRows, type ImportResult } from "./importProjectRows";
import type { Program, Project } from "./types";

export function ProjectImportModal({
  projects, programs, onClose, onDone,
}: { projects: Project[]; programs: Program[]; onClose: () => void; onDone: () => void }) {
  const { company } = useCompany();
  const { data: settings } = useAppSettings();
  const { data: users } = useUsers();
  const { pickSpreadsheet, extractFileId } = useGoogleImport();
  const [url, setUrl] = useState("");
  const [pickedName, setPickedName] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handlePick() {
    setError(null);
    setPicking(true);
    try {
      const picked = await pickSpreadsheet();
      if (picked) { setUrl(picked.url); setPickedName(picked.name); }
    } catch (e) {
      setError((e as Error).message || "Não foi possível abrir o seletor do Drive.");
    } finally {
      setPicking(false);
    }
  }

  async function handleImport() {
    const fileId = extractFileId(url.trim());
    if (!fileId) { setError("Não consegui reconhecer o ID da planilha nessa URL."); return; }
    setImporting(true);
    setError(null);
    try {
      const rows = await fetchGoogleSheetRows(settings?.googleClientId ?? "", fileId, "A1:Z2000");
      const r = await applyProjectRows(company.id, rows, projects, programs, users ?? []);
      setResult(r);
      onDone();
    } catch (e) {
      setError((e as Error).message || "Falha ao importar a planilha.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Importar projetos do Drive</h3></div>
        <div className="modal-body">
          {result ? (
            <p>
              Importação concluída: <strong>{result.created}</strong> projeto(s) criado(s), <strong>{result.updated}</strong> atualizado(s)
              {result.skipped > 0 && <>, {result.skipped} linha(s) ignorada(s) (sem nome)</>}.
            </p>
          ) : (
            <>
              <div className="field">
                <label>Planilha</label>
                <button className="btn" onClick={handlePick} disabled={picking} style={{ width: "100%", justifyContent: "center" }}>
                  <span className="msi">folder_open</span> {picking ? "Abrindo o Drive…" : "Escolher do Google Drive"}
                </button>
                {pickedName && <p className="hint" style={{ marginTop: 6 }}>Selecionada: <strong>{pickedName}</strong></p>}
              </div>
              <div className="field">
                <label htmlFor="proj-import-url">ou cole a URL da planilha</label>
                <input
                  id="proj-import-url" className="input" placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={url} onChange={(e) => { setUrl(e.target.value); setPickedName(null); setError(null); }}
                />
              </div>
              <p className="hint">
                A primeira linha deve ter os títulos das colunas. Projetos são identificados pelo nome — se já existir
                um projeto com aquele nome, os dados são atualizados; senão, um novo é criado. Briefing, Guias e
                Tarefas de projetos existentes não são alterados.
              </p>
              {error && <p className="hint" style={{ color: "var(--danger, #d33)" }}>{error}</p>}
            </>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>{result ? "Fechar" : "Cancelar"}</button>
          {!result && (
            <button className="btn primary" onClick={handleImport} disabled={importing || !url.trim()}>
              {importing ? "Importando…" : "Importar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
