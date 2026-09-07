import { createRow, listRows, newId, removeRow, updateRow } from "../../shared/lib/jsonStore";
import type { Launch } from "./types";

const TABLE = "launches";

export function listLaunches(companyId: string) {
  return listRows<Launch>(TABLE, companyId);
}

export function createLaunch(companyId: string, input: Partial<Launch>) {
  const now = new Date().toISOString();
  const launch: Launch = {
    id: newId("launch"),
    name: "",
    description: "",
    status: "backlog",
    launchDate: null,
    ownerId: null,
    notes: "",
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  return createRow(TABLE, companyId, launch);
}

export function updateLaunch(launch: Launch) {
  return updateRow(TABLE, { ...launch, updatedAt: new Date().toISOString() });
}

export function removeLaunch(id: string) {
  return removeRow(TABLE, id);
}
