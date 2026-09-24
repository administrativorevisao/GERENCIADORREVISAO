// Converte um link de compartilhamento do Google Drive (ou o ID puro do
// arquivo) na URL de imagem direta que o próprio Drive serve como
// pré-visualização. Não precisa de login Google nem do seletor de
// arquivos — só funciona se o arquivo estiver compartilhado como
// "Qualquer pessoa com o link" (senão o Drive mostra um ícone de
// "sem pré-visualização" no lugar da imagem, sem erro de JS pra capturar
// — por isso o aviso é mostrado sempre na UI, não só quando falha).
export function driveImageUrlFromLink(urlOrId: string): string | null {
  const s = String(urlOrId || "").trim();
  if (!s) return null;
  const m = s.match(/\/(?:file|open)(?:\/d)?\/([a-zA-Z0-9-_]+)|[?&]id=([a-zA-Z0-9-_]+)/);
  const id = m ? (m[1] ?? m[2]) : (/^[a-zA-Z0-9-_]{20,}$/.test(s) ? s : null);
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1600` : null;
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

// Redimensiona/comprime a imagem enviada (jpg/png) para um data URL leve
// antes de guardar — evita registros gigantes no banco (mesma técnica do
// index.html original: canvas + toDataURL em JPEG).
export function resizeImageToDataURL(file: File, maxDim = 320, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.onload = () => {
      img.onerror = () => reject(new Error("Arquivo de imagem inválido."));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale) || 1;
        const h = Math.round(img.height * scale) || 1;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
