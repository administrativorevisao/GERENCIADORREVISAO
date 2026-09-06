import { createRow, newId, updateRow } from "../../shared/lib/jsonStore";
import type { TeamUser } from "./types";

const USERS_TABLE = "users";

export function createUser(companyId: string, input: Partial<TeamUser>) {
  const user: TeamUser = {
    id: newId("u"),
    name: "",
    shortName: "",
    email: "",
    role: "collaborator",
    jobTitle: null,
    departmentId: null,
    teamId: null,
    birthDate: null,
    ...input,
  };
  return createRow(USERS_TABLE, companyId, user);
}

export function updateUser(user: TeamUser) {
  return updateRow(USERS_TABLE, user);
}
