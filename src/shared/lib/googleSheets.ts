// Sincronização com Google Sheets (Drive) — OAuth no navegador via Google
// Identity Services (sem backend) + a API REST do Sheets, só leitura, mais
// o Google Picker para escolher a planilha direto do Drive da empresa (em
// vez de colar a URL manualmente). Exige um Client ID OAuth (e, para o
// seletor do Drive, também uma Chave de API) configurados em Administração.
// Só funciona servido por http/https (não em file://) — o Google exige uma
// origem autorizada.
//
// Escopo "drive.file" (não o "drive.readonly" completo): o Picker é uma UI
// hospedada pelo próprio Google, então o usuário pode navegar em todo o
// Drive dele através dela; o app só recebe acesso ao arquivo específico que
// for escolhido — não à conta inteira.
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.file";

export type DrivePickerKind = "spreadsheets" | "documents" | "files";

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
      picker?: {
        Action: { PICKED: string; CANCEL: string };
        ViewId: { SPREADSHEETS: string; DOCUMENTS: string; DOCS: string };
        DocsView: new (viewId: string) => PickerDocsView;
        PickerBuilder: new () => PickerBuilder;
      };
    };
    gapi?: { load: (mod: string, cb: () => void) => void };
  }
}

interface PickerResponse {
  action: string;
  docs?: { id: string; name: string; url?: string }[];
}

interface PickerDocsView {
  setIncludeFolders: (v: boolean) => PickerDocsView;
  setMimeTypes: (v: string) => PickerDocsView;
  setSelectFolderEnabled: (v: boolean) => PickerDocsView;
}

interface PickerBuilder {
  addView: (view: PickerDocsView) => PickerBuilder;
  setOAuthToken: (token: string) => PickerBuilder;
  setDeveloperKey: (key: string) => PickerBuilder;
  setCallback: (cb: (data: PickerResponse) => void) => PickerBuilder;
  setTitle: (title: string) => PickerBuilder;
  build: () => { setVisible: (v: boolean) => void };
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

function ensureGooglePickerLib(): Promise<void> {
  if (window.google?.picker) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const afterApiLoaded = () => {
      window.gapi!.load("picker", () => resolve());
    };
    if (window.gapi) { afterApiLoaded(); return; }
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = afterApiLoaded;
    script.onerror = () => reject(new Error("Falha ao carregar o seletor de arquivos do Google (sem internet?)."));
    document.head.appendChild(script);
  });
}

// Abre o seletor visual do Google Drive filtrado por planilhas ou por
// documentos de texto. Retorna o arquivo escolhido (ou null se o usuário
// cancelar).
export async function openDrivePicker(
  apiKey: string,
  accessToken: string,
  kind: DrivePickerKind = "spreadsheets",
): Promise<{ id: string; name: string; url: string } | null> {
  if (!apiKey) throw new Error("Configure a Chave de API do Google em Administração antes de usar o seletor do Drive.");
  await ensureGooglePickerLib();
  const viewId = kind === "documents" ? window.google!.picker!.ViewId.DOCUMENTS
    : kind === "files" ? window.google!.picker!.ViewId.DOCS
    : window.google!.picker!.ViewId.SPREADSHEETS;
  const defaultUrlPrefix = kind === "documents" ? "https://docs.google.com/document/d/"
    : kind === "files" ? "https://drive.google.com/file/d/"
    : "https://docs.google.com/spreadsheets/d/";
  const title = kind === "documents" ? "Escolha o documento no Google Drive"
    : kind === "files" ? "Escolha o arquivo no Google Drive"
    : "Escolha a planilha no Google Drive";
  return new Promise((resolve, reject) => {
    try {
      const view = new window.google!.picker!.DocsView(viewId).setIncludeFolders(true);
      const picker = new window.google!.picker!.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        .setTitle(title)
        .setCallback((data: PickerResponse) => {
          if (data.action === window.google!.picker!.Action.PICKED) {
            const doc = data.docs?.[0];
            if (doc) resolve({ id: doc.id, name: doc.name, url: doc.url ?? `${defaultUrlPrefix}${doc.id}` });
            else resolve(null);
          } else if (data.action === window.google!.picker!.Action.CANCEL) {
            resolve(null);
          }
        })
        .build();
      picker.setVisible(true);
    } catch (e) {
      reject(e as Error);
    }
  });
}

let tokenCache: { token: string; expiresAt: number } | null = null;

export async function getGoogleAccessToken(clientId: string): Promise<string> {
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
      // "select_account" (não "" silencioso): com mais de uma conta Google
      // logada no navegador, o modo silencioso usa a conta "ativa" sem
      // perguntar — se não for a conta com acesso real ao arquivo (ex: a
      // conta da empresa), a importação falha com "403: the user has not
      // granted the app read access" sem nenhuma tela de erro clara sobre
      // o motivo. Forçar a escolha evita isso.
      tokenClient.requestAccessToken({ prompt: "select_account" });
    } catch (e) {
      clearTimeout(timeout);
      reject(e as Error);
    }
  });
}

// Planilhas reais às vezes têm espaços a mais no título da coluna (ex:
// " Valor " em vez de "Valor") — sem isso, toda leitura por r["Valor"]
// falha silenciosamente e a linha inteira é ignorada na importação.
function rowsFromValues(values: unknown[][]): SheetRow[] {
  if (!values.length) return [];
  const headerIdx = findHeaderRowIndex(values);
  const headers = (values[headerIdx] as string[]).map((h) => String(h ?? "").trim());
  return values.slice(headerIdx + 1).map((row) => {
    const obj: SheetRow = {};
    headers.forEach((h, i) => { obj[h] = row[i] != null ? String(row[i]) : ""; });
    return obj;
  });
}

// Algumas planilhas reais têm título, data de atualização e legenda antes da
// linha de cabeçalho de verdade (ex: relatório de contas bancárias com
// "Relatório Financeiro - VND" na linha 1 e os títulos das colunas só na
// linha 5) — sem isso, essas linhas de enfeite eram lidas como se fossem o
// cabeçalho e a planilha inteira vinha vazia. Cabeçalho de verdade: pelo
// menos 2 células não-vazias, todas texto (não número), com a linha seguinte
// tendo pelo menos 1 célula preenchida (dado real embaixo).
function looksLikeHeaderRow(row: unknown[], next: unknown[]): boolean {
  const nonEmpty = row.filter((c) => c != null && String(c).trim() !== "");
  if (nonEmpty.length < 2) return false;
  const allText = nonEmpty.every((c) => typeof c !== "number" && !/^-?\d+([.,]\d+)?$/.test(String(c).trim()));
  if (!allText) return false;
  return next.some((c) => c != null && String(c).trim() !== "");
}
function findHeaderRowIndex(values: unknown[][]): number {
  for (let i = 0; i < Math.min(values.length - 1, 25); i++) {
    if (looksLikeHeaderRow(values[i] ?? [], values[i + 1] ?? [])) return i;
  }
  return 0;
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
    const headerIdx = findHeaderRowIndex(values);
    const headers = (values[headerIdx] as string[]).map((h) => String(h ?? "").trim());
    const tabName = tabs[idx];
    values.slice(headerIdx + 1).forEach((row) => {
      const obj: SheetRow = { _aba: tabName };
      headers.forEach((h, i) => { obj[h] = row[i] != null ? String(row[i]) : ""; });
      rows.push(obj);
    });
  });
  return rows;
}

// Baixa o texto simples de um Google Doc via exportação do Drive (não
// precisa da Google Docs API — a Drive API, já ativada, exporta qualquer
// Doc como texto puro).
export async function fetchGoogleDocText(clientId: string, fileId: string): Promise<string> {
  const token = await getGoogleAccessToken(clientId);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Drive (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.text();
}

export const MONTH_TABS_PT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

// Extrai o ID de um arquivo do Drive a partir da URL (planilha, documento
// ou qualquer outro tipo) ou aceita o ID já "puro".
export function extractDriveFileId(urlOrId: string): string | null {
  const s = String(urlOrId || "").trim();
  const m = s.match(/\/(?:spreadsheets|document|file)\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  return /^[a-zA-Z0-9-_]{20,}$/.test(s) ? s : null;
}

export const extractSheetId = extractDriveFileId;

// Extrai o gid (id da aba) de uma URL do Google Sheets, ex:
// ".../edit?gid=417234875#gid=417234875" → "417234875". Sheets sem gid na
// URL (ou gid=0) apontam pra primeira aba, que já é o comportamento padrão.
export function extractGid(urlOrId: string): string | null {
  const m = String(urlOrId || "").match(/[?&#]gid=(\d+)/);
  return m ? m[1] : null;
}

// Resolve um gid pro nome real da aba (a API de valores do Sheets só aceita
// nome de aba no range, não o gid) — usado quando o usuário cola um link
// que aponta pra uma aba específica, pra sincronizar a aba certa em vez de
// sempre cair na primeira.
export async function fetchSheetTitleByGid(clientId: string, sheetId: string, gid: string): Promise<string | null> {
  const token = await getGoogleAccessToken(clientId);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Sheets (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const sheets: { properties: { sheetId: number; title: string } }[] = data.sheets ?? [];
  const match = sheets.find((s) => String(s.properties.sheetId) === gid);
  return match?.properties.title ?? null;
}
