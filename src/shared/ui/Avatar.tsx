// Foto de perfil circular, bem enquadrada (estilo WhatsApp) — usa a foto
// quando existe, senão cai para um círculo colorido com a inicial do nome.
export function Avatar({
  name, image, size = "md", className = "",
}: { name: string | null | undefined; image?: string | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClass = size === "lg" ? "avatar-lg" : size === "sm" ? "avatar-sm" : "";
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";

  if (image) {
    return <img src={image} alt="" className={`avatar ${sizeClass} ${className}`.trim()} />;
  }
  return <span className={`avatar ${sizeClass} ${className}`.trim()}>{initial}</span>;
}
