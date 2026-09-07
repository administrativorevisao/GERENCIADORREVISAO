import { useState } from "react";
import { useUsers } from "../team/useUsers";
import { useCreateLaunch, useUpdateLaunch } from "./useLaunches";
import type { Launch } from "./types";

export function LaunchModal({ launch, onClose }: { launch: Launch | null; onClose: () => void }) {
  const { data: users } = useUsers();
  const createLaunch = useCreateLaunch();
  const updateLaunch = useUpdateLaunch();

  const [name, setName] = useState(launch?.name ?? "");
  const [description, setDescription] = useState(launch?.description ?? "");
  const [launchDate, setLaunchDate] = useState(launch?.launchDate ?? "");
  const [ownerId, setOwnerId] = useState(launch?.ownerId ?? "");
  const [notes, setNotes] = useState(launch?.notes ?? "");

  const saving = createLaunch.isPending || updateLaunch.isPending;

  async function handleSave() {
    if (!name.trim()) return;
    const patch = { name: name.trim(), description, launchDate: launchDate || null, ownerId: ownerId || null, notes };
    if (launch) await updateLaunch.mutateAsync({ ...launch, ...patch });
    else await createLaunch.mutateAsync(patch);
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{launch ? "Editar lançamento" : "Novo lançamento"}</h3></div>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="launch-name">Nome</label>
            <input id="launch-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ex: Lançamento curso X" />
          </div>
          <div className="field">
            <label htmlFor="launch-desc">Descrição</label>
            <textarea id="launch-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="launch-date">Data prevista de lançamento</label>
              <input id="launch-date" type="date" className="input" value={launchDate} onChange={(e) => setLaunchDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="launch-owner">Responsável</label>
              <select id="launch-owner" className="input" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                <option value="">— Ninguém —</option>
                {(users ?? []).map((u) => <option key={u.id} value={u.id}>{u.shortName || u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="launch-notes">Observações</label>
            <textarea id="launch-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
