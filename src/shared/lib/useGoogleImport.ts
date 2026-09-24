import { useAppSettings } from "../../core/companies/appSettings";
import {
  extractDriveFileId, fetchGoogleDocText, fetchGoogleSheetRows, getGoogleAccessToken, openDrivePicker, type SheetRow,
} from "./googleSheets";
import { createCalendarEvent, deleteCalendarEvent, SCHEDULE_CALENDAR_ID, STRUCTURE_CALENDAR_ID, updateCalendarEvent } from "./googleCalendar";

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

  // Seletor sem restrição de tipo — pra anexar qualquer arquivo do Drive
  // (PDF, planilha, doc, imagem...) como documento de um projeto, guardando
  // só o link, sem extrair conteúdo.
  async function pickAnyFile(): Promise<{ id: string; name: string; url: string } | null> {
    requireCreds();
    const token = await getGoogleAccessToken(clientId);
    return openDrivePicker(apiKey, token, "files");
  }

  async function sheetRowsFromId(fileId: string): Promise<SheetRow[]> {
    if (!clientId) throw new Error("Configure o Client ID do Google em Administração antes de importar.");
    return fetchGoogleSheetRows(clientId, fileId, "A1:Z2000");
  }

  async function docTextFromId(fileId: string): Promise<string> {
    if (!clientId) throw new Error("Configure o Client ID do Google em Administração antes de importar.");
    return fetchGoogleDocText(clientId, fileId);
  }

  // Sincroniza uma data do Cronograma completo do curso (aba Concurso) com
  // a Agenda Google fixa (ver googleCalendar.ts) — cria um evento novo, ou
  // atualiza um já existente se passar o eventId.
  async function syncScheduleEvent(summary: string, dateISO: string, description: string | undefined, existingEventId: string | null): Promise<string> {
    if (!clientId) throw new Error("Configure o Client ID do Google em Administração antes de sincronizar com a Agenda.");
    if (existingEventId) {
      await updateCalendarEvent(clientId, SCHEDULE_CALENDAR_ID, existingEventId, summary, dateISO, description);
      return existingEventId;
    }
    return createCalendarEvent(clientId, SCHEDULE_CALENDAR_ID, summary, dateISO, description);
  }

  async function removeScheduleEvent(eventId: string): Promise<void> {
    if (!clientId) throw new Error("Configure o Client ID do Google em Administração antes de sincronizar com a Agenda.");
    return deleteCalendarEvent(clientId, SCHEDULE_CALENDAR_ID, eventId);
  }

  // Mesma coisa, mas na segunda agenda fixa — usada pelas datas da
  // Estrutura do curso (Coordenação/Cronograma/Legislação Local).
  async function syncStructureEvent(summary: string, dateISO: string, description: string | undefined, existingEventId: string | null): Promise<string> {
    if (!clientId) throw new Error("Configure o Client ID do Google em Administração antes de sincronizar com a Agenda.");
    if (existingEventId) {
      await updateCalendarEvent(clientId, STRUCTURE_CALENDAR_ID, existingEventId, summary, dateISO, description);
      return existingEventId;
    }
    return createCalendarEvent(clientId, STRUCTURE_CALENDAR_ID, summary, dateISO, description);
  }

  async function removeStructureEvent(eventId: string): Promise<void> {
    if (!clientId) throw new Error("Configure o Client ID do Google em Administração antes de sincronizar com a Agenda.");
    return deleteCalendarEvent(clientId, STRUCTURE_CALENDAR_ID, eventId);
  }

  return {
    ready: Boolean(clientId && apiKey),
    pickSpreadsheet,
    pickDocument,
    pickAnyFile,
    sheetRowsFromId,
    docTextFromId,
    syncScheduleEvent,
    removeScheduleEvent,
    syncStructureEvent,
    removeStructureEvent,
    extractFileId: extractDriveFileId,
  };
}
