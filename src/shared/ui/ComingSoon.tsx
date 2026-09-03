export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="empty">
      <div className="big msi">construction</div>
      <div className="section-title" style={{ justifyContent: "center" }}>{title}</div>
      <p className="muted">Este módulo ainda está sendo portado para a nova plataforma.</p>
    </div>
  );
}
