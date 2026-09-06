import { useState } from "react";
import type { Calendar } from "./types";
import { BIRTHDAYS_CALENDAR_ID } from "./types";
import { useCreateCalendarEvent } from "./useCalendars";
import { todayISO } from "../../shared/lib/dates";

export function EventFormModal({ calendars, defaultDate, onClose }: { calendars: Calendar[]; defaultDate?: string; onClose: () => void }) {
  const createEvent = useCreateCalendarEvent();
  const selectable = calendars.filter((c) => c.id !== BIRTHDAYS_CALENDAR_ID);
  const [calendarId, setCalendarId] = useState(selectable[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate ?? todayISO());
  const [description, setDescription] = useState("");

  async function handleSave() {
    if (!title.trim() || !calendarId) return;
    await createEvent.mutateAsync({ calendarId, title: title.trim(), date, description });
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Novo evento</h3></div>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="ev-cal">Calendário</label>
            <select id="ev-cal" className="input" value={calendarId} onChange={(e) => setCalendarId(e.target.value)}>
              {selectable.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ev-title">Título</label>
            <input id="ev-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label htmlFor="ev-date">Data</label>
            <input id="ev-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ev-desc">Descrição</label>
            <textarea id="ev-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={createEvent.isPending || !title.trim()}>
            {createEvent.isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
