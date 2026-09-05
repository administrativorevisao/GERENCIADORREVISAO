import { createRow, listRows, newId, updateRow } from "../../shared/lib/jsonStore";
import { todayISO } from "../../shared/lib/dates";
import type { Meeting } from "./types";

const TABLE = "meetings";

export function listMeetings(companyId: string) {
  return listRows<Meeting>(TABLE, companyId);
}

export function createMeeting(companyId: string, input: Partial<Meeting>, createdBy: string | null) {
  const meeting: Meeting = {
    id: newId("mt"),
    departmentId: null,
    projectId: null,
    title: "",
    date: todayISO(),
    recordingUrl: "",
    decisions: "",
    transcript: "",
    createdBy,
    createdAt: new Date().toISOString(),
    ...input,
  };
  return createRow(TABLE, companyId, meeting);
}

export function updateMeeting(meeting: Meeting) {
  return updateRow(TABLE, meeting);
}
