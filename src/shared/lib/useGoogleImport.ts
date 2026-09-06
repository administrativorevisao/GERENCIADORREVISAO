import { useAppSettings } from "../../core/companies/appSettings";
import {
  extractDriveFileId, fetchGoogleDocText, fetchGoogleSheetRows, getGoogleAccessToken, openDrivePicker, type SheetRow,
} from "./googleSheets";

// Wrapper compartilhado em cima de googleSheets.ts: cuida de checar as
// credenciais configuradas em Administração e expõe duas operações simples
// — "traga linhas de uma planilha" e "traga o texto de um documento" — a
// partir do seletor do Drive ou de uma URL colada. Usado por qualquer tela
// que precise importar dados do Google (Financeiro já usa o googleSheets.ts
// direto; Equipe/Projetos usam este hook).
export function useGoogleImport() {
  const { data: settings } = useAppSettings();
  const clientId = settings?.googleClientId ?? "";
  const apiKey = settings?.googleApiKey ?? "";

  function requireCreds() {
    if (!clientId) throw new Error("Configure o Client ID do Google em Administração antes de importar.");
    if (!apiKey) throw new Error("Configure a Chave de API do Google em Administração antes de usar o seletor do Drive.");
  }

  async function pickSpreadsheet(): Promise<{ id: string; name: string; url: string } | null> {
    requireCreds();
    const token = await getGoogleAccessToken(clientId);
    return openDrivePicker(apiKey, token, "spreadsheets");
  }

  async function pickDocument(): Promise<{ id: string; name: string; url: string } | null> {
    requireCreds();
    const token = await getGoogleAccessToken(clientId);
    return openDrivePicker(apiKey, token, "documents");
  }

  async function sheetRowsFromId(fileId: string): Promise<SheetRow[]> {
    if (!clientId) throw new Error("Configure o Client ID do Google em Administração antes de importar.");
    return fetchGoogleSheetRows(clientId, fileId, "A1:Z2000");
  }

  async function docTextFromId(fileId: string): Promise<string> {
    if (!clientId) throw new Error("Configure o Client ID do Google em Administração antes de importar.");
    return fetchGoogleDocText(clientId, fileId);
  }

  return {
    ready: Boolean(clientId && apiKey),
    pickSpreadsheet,
    pickDocument,
    sheetRowsFromId,
    docTextFromId,
    extractFileId: extractDriveFileId,
  };
}
