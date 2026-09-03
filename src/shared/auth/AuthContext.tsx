import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";
import { useCompany } from "../../core/companies/CompanyContext";
import type { Profile } from "./types";

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Converte uma linha "data jsonb" de public.users (snake/camel mistos, ver
// schema atual) no formato Profile usado pelo front. Mantém-se tolerante a
// campos ausentes até a Fase 1 migrar os dados reais.
function rowToProfile(id: string, data: Record<string, unknown>): Profile {
  return {
    id,
    companyId: (data.companyId as string) ?? "revisao",
    name: (data.name as string) ?? "",
    shortName: (data.shortName as string) ?? (data.name as string) ?? "",
    email: (data.email as string) ?? "",
    role: (data.role as Profile["role"]) ?? "collaborator",
    jobTitle: (data.jobTitle as string) ?? null,
    departmentId: (data.departmentId as string) ?? null,
    teamId: (data.teamId as string) ?? null,
    avatarImage: (data.avatarImage as string) ?? null,
    allowedViews: (data.allowedViews as string[]) ?? null,
    financeAccess: Boolean(data.financeAccess),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { company } = useCompany();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setLoading(false);
      setError("Supabase não configurado — preencha .env.local (ver .env.example).");
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user?.email) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("users")
      .select("id,data")
      .ilike("data->>email", session.user.email)
      .maybeSingle()
      .then(({ data, error: qErr }) => {
        if (cancelled) return;
        if (qErr) {
          setError(qErr.message);
          setProfile(null);
        } else if (data) {
          setProfile(rowToProfile(data.id as string, data.data as Record<string, unknown>));
        } else {
          setError("Login válido, mas nenhum cadastro de colaborador foi encontrado para este e-mail.");
          setProfile(null);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, company.id]);

  async function signIn(email: string, password: string) {
    if (!supabase) return { error: "Supabase não configurado." };
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      return { error: signInError.message };
    }
    return { error: null };
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
