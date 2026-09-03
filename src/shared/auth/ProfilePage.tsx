import { useAuth } from "./AuthContext";

export function ProfilePage() {
  const { profile } = useAuth();
  if (!profile) return null;
  return (
    <div className="card card-pad" style={{ maxWidth: 480 }}>
      <div className="section-title">Perfil</div>
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
    </div>
  );
}
