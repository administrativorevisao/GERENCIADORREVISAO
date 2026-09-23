// Alguns links (documento do projeto, link por setor, gravação de reunião)
// vêm de texto livre digitado por qualquer colaborador e depois são
// renderizados como <a href>. Sem checar o esquema, alguém poderia colar
// "javascript:..." ali e virar um link que executa código quando outra
// pessoa (inclusive um admin) clicar — só permite http(s), o resto vira "#"
// (link morto) em vez de executar.
export function safeHref(url: string | null | undefined): string {
  if (!url) return "#";
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : "#";
  } catch {
    return "#";
  }
}
