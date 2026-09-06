import { useEffect, useState } from "react";
import { useCompany } from "../../core/companies/CompanyContext";
import { useCompanySettings, useUpdateCompanySettings } from "../../core/companies/companySettings";
import { useAppSettings, useUpdateAppSettings } from "../../core/companies/appSettings";
import { pickFile, resizeImageToDataURL } from "../lib/imageUpload";
import { BrandLogo } from "../ui/BrandLogo";

export function AdminPage() {
  const { company } = useCompany();
  const { data: settings } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();
  const [uploading, setUploading] = useState(false);
  const { data: appSettings } = useAppSettings();
  const updateAppSettings = useUpdateAppSettings();
  const [clientId, setClientId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [savedClientId, setSavedClientId] = useState(false);

  async function handleUpload() {
    const file = await pickFile("image/jpeg,image/png,image/jpg");
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert("Imagem muito grande (máx. 8MB).");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await resizeImageToDataURL(file);
      await updateSettings.mutateAsync({ customLogo: dataUrl });
    } catch (e) {
      console.error(e);
      alert("Não foi possível processar essa imagem.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    await updateSettings.mutateAsync({ customLogo: null });
  }

  useEffect(() => {
    if (appSettings) {
      setClientId(appSettings.googleClientId);
      setApiKey(appSettings.googleApiKey);
    }
  }, [appSettings]);

  async function saveClientId() {
    await updateAppSettings.mutateAsync({ googleClientId: clientId.trim(), googleApiKey: apiKey.trim() });
    setSavedClientId(true);
    setTimeout(() => setSavedClientId(false), 2000);
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
      <div className="card card-pad">
        <div className="section-title"><span className="msi">palette</span> Identidade visual — {company.name}</div>
        <p className="muted" style={{ fontSize: 12.5 }}>
          Envie a logo real da empresa (JPG ou PNG) para substituir o símbolo padrão em todo o sistema — barra
          lateral, tela de login etc. A cor de destaque continua sendo a da marca.
        </p>
        <div className="row" style={{ alignItems: "center", gap: 14, margin: "10px 0" }}>
          <BrandLogo company={company} size={56} />
          <div className="row" style={{ flex: 1 }}>
            <button className="btn sm" onClick={handleUpload} disabled={uploading}>
              <span className="msi">upload_file</span> {uploading ? "Enviando…" : "Enviar logo (JPG/PNG)"}
            </button>
            {settings?.customLogo && (
              <button className="btn sm danger" onClick={handleRemove}>Remover</button>
            )}
          </div>
        </div>
        <p className="hint">
          A imagem é redimensionada automaticamente. Cada empresa (Revisão/MEQ/MAC/VND) tem sua própria logo —
          troque de empresa na lateral para personalizar as outras.
        </p>
      </div>

      <div className="card card-pad">
        <div className="section-title"><span className="msi">sync</span> Sincronização com Google Sheets</div>
        <p className="muted" style={{ fontSize: 12.5 }}>
          Client ID e Chave de API do Google (mesmos para todas as empresas, um só cadastro no Google Cloud).
          Necessários para que o módulo Financeiro consiga escolher planilhas direto do Drive e ler os dados
          vinculados em cada aba.
        </p>
        <div className="field" style={{ margin: "10px 0" }}>
          <label htmlFor="google-client-id">Client ID OAuth</label>
          <input
            id="google-client-id" className="input" placeholder="xxxxxxxxxx.apps.googleusercontent.com"
            value={clientId} onChange={(e) => setClientId(e.target.value)}
          />
        </div>
        <div className="field" style={{ margin: "10px 0" }}>
          <label htmlFor="google-api-key">Chave de API (seletor do Drive)</label>
          <input
            id="google-api-key" className="input" placeholder="AIzaSy..."
            value={apiKey} onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <button className="btn sm primary" onClick={saveClientId} disabled={updateAppSettings.isPending}>
          {savedClientId ? "Salvo ✓" : "Salvar"}
        </button>
        <p className="hint" style={{ marginTop: 10 }}>
          Crie as duas credenciais em console.cloud.google.com: o Client ID como OAuth 2.0 do tipo "Aplicativo da
          Web" (autorizando a origem deste site) e a Chave de API em "Credenciais → Criar credenciais → Chave de
          API" (restrinja-a à Google Sheets API, Google Drive API e Google Picker API). Ative as três APIs no
          projeto do Google Cloud.
        </p>
      </div>
    </div>
  );
}
