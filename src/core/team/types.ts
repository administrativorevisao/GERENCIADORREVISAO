export interface TeamUser {
  id: string;
  name: string;
  shortName: string;
  email: string;
  role: "admin" | "collaborator";
  jobTitle: string | null;
  departmentId: string | null;
  teamId: string | null;
}
