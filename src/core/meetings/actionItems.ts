import type { TeamUser } from "../team/types";
import type { ActionItemSuggestion } from "./types";

const ACTION_ITEM_PATTERN =
  /\b(vou|vai|ficou de|fica de|ficaram de|precisa(mos)?|ação:|tarefa:|a[cç][ãa]o:|até (o )?dia|prazo:|fica responsável|ficará responsável)\b/i;

function findDateISOInLine(line: string): string | null {
  const m = line.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (!m) return null;
  const [, d, mo, yRaw] = m;
  const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
  const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}

// Heurística sem IA: procura linhas com verbos/expressões de compromisso e
// tenta reconhecer responsável (nome citado na linha) e data. Sempre
// retorna SUGESTÕES para revisão humana — nunca cria tarefas sozinha.
export function extractActionItems(text: string, users: TeamUser[]): ActionItemSuggestion[] {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items: ActionItemSuggestion[] = [];
  for (const line of lines) {
    if (!ACTION_ITEM_PATTERN.test(line)) continue;
    if (line.length < 8) continue;
    const iso = findDateISOInLine(line);
    const forSearch = line.replace(/^\s*[A-ZÀ-Ú][\wÀ-ú]*\s*:\s*/, "");
    const user = users.find(
      (u) => u.shortName && new RegExp(`\\b${u.shortName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(forSearch),
    );
    items.push({ title: line.slice(0, 180), responsibleId: user?.id ?? null, dueDate: iso ?? "" });
    if (items.length >= 40) break;
  }
  return items;
}
