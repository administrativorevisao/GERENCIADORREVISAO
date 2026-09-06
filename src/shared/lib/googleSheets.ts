// Sincronização com Google Sheets (Drive) — OAuth no navegador via Google
// Identity Services (sem backend) + a API REST do Sheets, só leitura.
// Exige um Client ID OAuth configurado em Administração. Só funciona
// servido por http/https (não em file://) — o Google exige uma origem
// autorizada.
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => void;
          }): { requestAccessToken: (opts: { prompt: string }) => void };
        };
      };
    };
  }
}

export type SheetRow = Record<string, string>;

function ensureGoogleIdentityLib(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar o script do Google (sem internet?)."));
    document.head.appendChild(script);
  });
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getGoogleAccessToken(clientId: string): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30000) return tokenCache.token;
  if (!clientId) throw new Error("Configure o Client ID do Google em Administração antes de vincular planilhas.");
  await ensureGoogleIdentityLib();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("O Google não respondeu. Verifique se o pop-up de login não foi bloqueado pelo navegador e tente novamente."));
    }, 25000);
    try {
      const tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_SHEETS_SCOPE,
        callback: (resp) => {
          clearTimeout(timeout);
          if (resp.error || !resp.access_token) {
            reject(new Error(resp.error ?? "Falha na autenticação."));
            return;
          }
          tokenCache = { token: resp.access_token, expiresAt: Date.now() + (resp.expires_in ?? 3600) * 1000 };
          resolve(resp.access_token);
        },
      });
      tokenClient.requestAccessToken({ prompt: "" });
    } catch (e) {
      clearTimeout(timeout);
      reject(e as Error);
    }
  });
}

function rowsFromValues(values: unknown[][]): SheetRow[] {
  if (!values.length) return [];
  const headers = values[0] as string[];
  return values.slice(1).map((row) => {
    const obj: SheetRow = {};
    headers.forEach((h, i) => { obj[h] = row[i] != null ? String(row[i]) : ""; });
    return obj;
  });
}

export async function fetchGoogleSheetRows(clientId: string, sheetId: string, range: string): Promise<SheetRow[]> {
  const token = await getGoogleAccessToken(clientId);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Sheets (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return rowsFromValues(data.values ?? []);
}

// Lê várias abas de uma vez (ex: uma planilha com uma aba por mês). Cada
// linha ganha um campo extra "_aba" com o nome da aba de origem.
export async function fetchGoogleSheetRowsMulti(clientId: string, sheetId: string, tabs: string[]): Promise<SheetRow[]> {
  const token = await getGoogleAccessToken(clientId);
  const q = tabs.map((t) => `ranges=${encodeURIComponent(`'${t.replace(/'/g, "\\'")}'!A1:Z2000`)}`).join("&");
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Sheets (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const rows: SheetRow[] = [];
  (data.valueRanges ?? []).forEach((vr: { values?: unknown[][] }, idx: number) => {
    const values = vr.values ?? [];
    if (!values.length) return;
    const headers = values[0] as string[];
    const tabName = tabs[idx];
    values.slice(1).forEach((row) => {
      const obj: SheetRow = { _aba: tabName };
      headers.forEach((h, i) => { obj[h] = row[i] != null ? String(row[i]) : ""; });
      rows.push(obj);
    });
  });
  return rows;
}

export const MONTH_TABS_PT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

export function extractSheetId(urlOrId: string): string | null {
  const s = String(urlOrId || "").trim();
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  return /^[a-zA-Z0-9-_]{20,}$/.test(s) ? s : null;
}
