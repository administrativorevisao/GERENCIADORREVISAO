// Edge Function: cria (ou redefine a senha de) o login de acesso de um
// colaborador — e-mail + senha definidos pelo administrador. Só pode rodar
// aqui, nunca no navegador, porque precisa da chave de serviço (service
// role) do Supabase para usar a Admin API de autenticação.
//
// Deploy: cole este arquivo na aba "Edge Functions" do painel do Supabase
// (Functions → Create a new function → nome "admin-create-login") e clique
// em Deploy. As variáveis SUPABASE_URL / SUPABASE_ANON_KEY /
// SUPABASE_SERVICE_ROLE_KEY já vêm prontas automaticamente em toda function
// — não precisa configurar nenhum segredo à mão.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Não autenticado." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Descobre quem está chamando (com o token dele, sem privilégios extras).
  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: callerAuth, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !callerAuth.user?.email) return json({ error: "Sessão inválida." }, 401);

  // Dali em diante, usa a chave de serviço (ignora RLS) — só depois de já
  // ter confirmado que quem chamou é admin.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: callerRow } = await adminClient.from("users").select("data").ilike("data->>email", callerAuth.user.email).maybeSingle();
  const callerData = callerRow?.data as Record<string, unknown> | undefined;
  if (callerData?.role !== "admin") return json({ error: "Só administradores podem criar login de acesso." }, 403);

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corpo da requisição inválido." }, 400);
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!email) return json({ error: "Informe um e-mail." }, 400);
  if (password.length < 8) return json({ error: "A senha precisa ter pelo menos 8 caracteres." }, 400);

  const { data: existingList, error: listErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return json({ error: listErr.message }, 400);
  const existing = existingList.users.find((u) => u.email?.toLowerCase() === email);

  if (existing) {
    const { error: updErr } = await adminClient.auth.admin.updateUserById(existing.id, { password });
    if (updErr) return json({ error: updErr.message }, 400);
    return json({ ok: true, action: "updated" });
  }

  const { error: createErr } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true });
  if (createErr) return json({ error: createErr.message }, 400);
  return json({ ok: true, action: "created" });
});
