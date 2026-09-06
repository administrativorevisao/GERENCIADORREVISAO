import { useState } from "react";
import { useCompany } from "../../core/companies/CompanyContext";
import { useCompanySettings, useUpdateCompanySettings } from "../../core/companies/companySettings";
import { pickFile, resizeImageToDataURL } from "../lib/imageUpload";
import { BrandLogo } from "../ui/BrandLogo";

export function AdminPage() {
  const { company } = useCompany();
  const { data: settings } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();
  const [uploading, setUploading] = useState(false);

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
    </div>
  );
}
