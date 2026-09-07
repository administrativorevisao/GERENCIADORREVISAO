export interface MarketingSector {
  id: string;
  name: string;
  icon: string;
}

export const MARKETING_SECTORS: MarketingSector[] = [
  { id: "audiovisual", name: "Audiovisual", icon: "videocam" },
  { id: "copy", name: "Copy", icon: "edit_note" },
  { id: "conteudo", name: "Conteúdo", icon: "article" },
  { id: "design", name: "Design", icon: "palette" },
];

export function marketingSectorName(id: string | null | undefined): string {
  return MARKETING_SECTORS.find((s) => s.id === id)?.name ?? "Sem micro setor";
}
