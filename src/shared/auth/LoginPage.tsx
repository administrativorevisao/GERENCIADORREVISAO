import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthContext";
import { useCompany } from "../../core/companies/CompanyContext";

export function LoginPage() {
  const { signIn, error } = useAuth();
  const { company } = useCompany();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await signIn(email, password);
    setSubmitting(false);
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand" style={{ justifyContent: "center", paddingBottom: 20 }}>
          <div className="brand-logo">{company.initials}</div>
          <div className="brand-txt">
            <b>{company.name}OS</b>
            <span>{company.sub}</span>
          </div>
        </div>
        <form className="card card-pad" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              className="input"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="err" style={{ marginBottom: 12 }}>{error}</div>}
          <button className="btn primary" type="submit" disabled={submitting} style={{ width: "100%" }}>
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
