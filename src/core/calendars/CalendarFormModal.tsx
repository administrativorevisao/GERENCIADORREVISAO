import { useState } from "react";
import { CALENDAR_COLORS } from "./types";
import { useCreateCalendar } from "./useCalendars";

export function CalendarFormModal({ onClose }: { onClose: () => void }) {
  const createCalendar = useCreateCalendar();
  const [name, setName] = useState("");
  const [color, setColor] = useState(CALENDAR_COLORS[0]);

  async function handleSave() {
    if (!name.trim()) return;
    await createCalendar.mutateAsync({ name: name.trim(), color });
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Novo calendário</h3></div>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="cal-name">Nome</label>
            <input id="cal-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="ex: Editais, Marketing…" />
          </div>
          <div className="field">
            <label>Cor</label>
            <div className="row" style={{ gap: 6 }}>
              {CALENDAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ width: 26, height: 26, borderRadius: "50%", background: c, flex: "none", border: c === color ? "2px solid var(--text)" : "2px solid transparent" }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={createCalendar.isPending || !name.trim()}>
            {createCalendar.isPending ? "Salvando…" : "Criar calendário"}
          </button>
        </div>
      </div>
    </div>
  );
}
