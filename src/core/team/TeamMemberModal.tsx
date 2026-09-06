import { useState } from "react";
import { STANDARD_DEPARTMENTS } from "../companies/companies";
import { pickFile, resizeImageToDataURL } from "../../shared/lib/imageUpload";
import { createOrResetLogin } from "./adminAuth";
import { useRoles } from "./roles";
import { useCreateUser, useUpdateUser } from "./useUsers";
import { PAYMENT_TYPE_LABEL, type PaymentType, type TeamUser } from "./types";

export function TeamMemberModal({ user, onClose }: { user: TeamUser | null; onClose: () => void }) {
  const { data: roles } = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [name, setName] = useState(user?.name ?? "");
  const [shortName, setShortName] = useState(user?.shortName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? "");
  const [departmentId, setDepartmentId] = useState(user?.departmentId ?? "");
  const [roleId, setRoleId] = useState(user?.roleId ?? "");
  const [birthDate, setBirthDate] = useState(user?.birthDate ?? "");
  const [avatarImage, setAvatarImage] = useState(user?.avatarImage ?? null);
  const [notes, setNotes] = useState(user?.notes ?? "");
  const [paymentType, setPaymentType] = useState<PaymentType | "">(user?.paymentType ?? "");
  const [paymentAmount, setPaymentAmount] = useState(String(user?.paymentAmount ?? ""));
  const [paymentBankInfo, setPaymentBankInfo] = useState(user?.paymentBankInfo ?? "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);

  const saving = createUser.isPending || updateUser.isPending;

  async function handleAvatarUpload() {
    const file = await pickFile("image/jpeg,image/png,image/jpg");
    if (!file) return;
    setUploadingAvatar(true);
    try {
      setAvatarImage(await resizeImageToDataURL(file, 240));
    } catch (e) {
      console.error(e);
      alert("Não foi possível processar essa imagem.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) return;
    const role = (roles ?? []).find((r) => r.id === roleId) ?? null;
    const patch: Partial<TeamUser> = {
      name: name.trim(),
      shortName: shortName.trim() || name.trim().split(" ")[0],
      email: email.trim().toLowerCase(),
      jobTitle: jobTitle.trim() || null,
      departmentId: departmentId || null,
      birthDate: birthDate || null,
      avatarImage,
      notes,
      paymentType: paymentType || null,
      paymentAmount: paymentAmount.trim() ? Number(paymentAmount) : null,
      paymentBankInfo,
      roleId: roleId || null,
      role: role ? (role.isAdmin ? "admin" : "collaborator") : (user?.role ?? "collaborator"),
      financeAccess: role ? role.financeAccess : (user?.financeAccess ?? false),
      allowedViews: role ? role.allowedViews : (user?.allowedViews ?? null),
    };
    if (user) await updateUser.mutateAsync({ ...user, ...patch });
    else await createUser.mutateAsync(patch);
    onClose();
  }

  async function handleCreateLogin() {
    if (!email.trim()) { setLoginMessage("Preencha o e-mail antes de criar o login."); return; }
    if (password.length < 8) { setLoginMessage("A senha precisa ter pelo menos 8 caracteres."); return; }
    setLoginBusy(true);
    setLoginMessage(null);
    try {
      const { action } = await createOrResetLogin(email.trim(), password);
      if (user) await updateUser.mutateAsync({ ...user, hasLogin: true });
      setLoginMessage(action === "created" ? "Login criado com sucesso." : "Senha redefinida com sucesso.");
      setPassword("");
    } catch (e) {
      setLoginMessage((e as Error).message || "Falha ao criar login.");
    } finally {
      setLoginBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{user ? "Editar colaborador" : "Novo colaborador"}</h3></div>
        <div className="modal-body">
          <div className="row" style={{ alignItems: "center", gap: 14, marginBottom: 12 }}>
            {avatarImage ? (
              <img src={avatarImage} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--surface-2, #eee)", display: "grid", placeItems: "center" }}>
                <span className="msi">person</span>
              </div>
            )}
            <button className="btn sm" onClick={handleAvatarUpload} disabled={uploadingAvatar}>
              {uploadingAvatar ? "Enviando…" : "Enviar foto"}
            </button>
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="tm-name">Nome</label>
              <input id="tm-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label htmlFor="tm-shortname">Nome curto</label>
              <input id="tm-shortname" className="input" value={shortName} onChange={(e) => setShortName(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="tm-email">E-mail</label>
            <input id="tm-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="tm-job">Cargo</label>
              <input id="tm-job" className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="tm-dept">Setor</label>
              <select id="tm-dept" className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">— Nenhum —</option>
                {STANDARD_DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="tm-role">Perfil de acesso</label>
              <select id="tm-role" className="input" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                <option value="">— Nenhum —</option>
                {(roles ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="tm-birth">Aniversário</label>
              <input id="tm-birth" type="date" className="input" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="tm-notes">Observações</label>
            <textarea id="tm-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotações internas sobre este colaborador" />
          </div>

          <div className="section-title" style={{ fontSize: 13, marginTop: 14 }}>Pagamento</div>
          <div className="row">
            <div className="field">
              <label htmlFor="tm-paytype">Tipo de contrato</label>
              <select id="tm-paytype" className="input" value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType | "")}>
                <option value="">— Nenhum —</option>
                {Object.entries(PAYMENT_TYPE_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="tm-payamount">Valor</label>
              <input id="tm-payamount" type="number" step="0.01" className="input" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0,00" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="tm-paybank">Dados bancários / PIX</label>
            <input id="tm-paybank" className="input" value={paymentBankInfo} onChange={(e) => setPaymentBankInfo(e.target.value)} placeholder="Banco, agência/conta ou chave PIX" />
          </div>

          {user && (
            <>
              <div className="section-title" style={{ fontSize: 13, marginTop: 14 }}>Login de acesso</div>
              <p className="hint">
                {user.hasLogin ? "Este colaborador já tem login. Defina uma senha nova abaixo para redefini-la." : "Defina uma senha para criar o login deste colaborador (ele entra com o e-mail acima)."}
              </p>
              <div className="row" style={{ alignItems: "flex-end" }}>
                <div className="field">
                  <label htmlFor="tm-password">Nova senha</label>
                  <input id="tm-password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
                </div>
                <button className="btn sm" onClick={handleCreateLogin} disabled={loginBusy}>
                  {loginBusy ? "Enviando…" : user.hasLogin ? "Redefinir senha" : "Criar login"}
                </button>
              </div>
              {loginMessage && <p className="hint">{loginMessage}</p>}
            </>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
