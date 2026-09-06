import { useState } from "react";
import { pickFile, resizeImageToDataURL } from "../lib/imageUpload";
import { useAuth } from "./AuthContext";

export function ProfilePage() {
  const { profile, updateOwnProfile } = useAuth();
  const [birthDate, setBirthDate] = useState(profile?.birthDate ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  if (!profile) return null;

  async function saveBirthDate() {
    setSaving(true);
    await updateOwnProfile({ birthDate: birthDate || null });
    setSaving(false);
  }

  async function handleAvatarUpload() {
    const file = await pickFile("image/jpeg,image/png,image/jpg");
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const dataUrl = await resizeImageToDataURL(file, 240);
      await updateOwnProfile({ avatarImage: dataUrl });
    } catch (e) {
      console.error(e);
      alert("Não foi possível processar essa imagem.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <div className="card card-pad" style={{ maxWidth: 480 }}>
      <div className="section-title">Perfil</div>
      <div className="row" style={{ alignItems: "center", gap: 14, marginBottom: 14 }}>
        {profile.avatarImage ? (
          <img src={profile.avatarImage} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--surface-2, #eee)", display: "grid", placeItems: "center" }}>
            <span className="msi" style={{ fontSize: 32 }}>person</span>
          </div>
        )}
        <button className="btn sm" onClick={handleAvatarUpload} disabled={uploadingAvatar}>
          {uploadingAvatar ? "Enviando…" : "Trocar foto"}
        </button>
      </div>
      <div className="field">
        <label>Nome</label>
        <div>{profile.name}</div>
      </div>
      <div className="field">
        <label>E-mail</label>
        <div>{profile.email}</div>
      </div>
      <div className="field">
        <label>Cargo</label>
        <div>{profile.jobTitle ?? "—"}</div>
      </div>
      <div className="field">
        <label>Perfil de acesso</label>
        <div>{profile.role === "admin" ? "Administrador" : "Colaborador"}</div>
      </div>
      <div className="field">
        <label htmlFor="profile-birth">Data de nascimento</label>
        <div className="row">
          <input id="profile-birth" type="date" className="input" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          {birthDate !== (profile.birthDate ?? "") && (
            <button className="btn primary sm" onClick={saveBirthDate} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </button>
          )}
        </div>
        <p className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>Usada só para aparecer no calendário de Aniversários da empresa (mês e dia, todo ano).</p>
      </div>
    </div>
  );
}
