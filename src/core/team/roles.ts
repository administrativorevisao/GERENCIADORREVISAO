import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRow, listRows, newId, removeRow, updateRow } from "../../shared/lib/jsonStore";
import { useCompany } from "../companies/CompanyContext";
import { updateUser } from "./api";
import type { TeamUser } from "./types";

const ROLES_TABLE = "roles";

// Um "modelo de usuário" (perfil de acesso) — definido livremente em
// Administração, não fixo no código. isAdmin dá acesso total ao sistema;
// financeAccess dá acesso de edição completa ao Financeiro; allowedViews
// controla quais telas aparecem na barra lateral (null = todas, exceto
// Financeiro, que é controlado à parte por financeAccess).
export interface Role {
  id: string;
  name: string;
  isAdmin: boolean;
  financeAccess: boolean;
  allowedViews: string[] | null;
  createdAt: string;
}

export function listRoles(companyId: string) {
  return listRows<Role>(ROLES_TABLE, companyId);
}

export function useRoles() {
  const { company } = useCompany();
  return useQuery({ queryKey: [ROLES_TABLE, company.id], queryFn: () => listRoles(company.id) });
}

function applyRoleToUsers(role: Role, users: TeamUser[]) {
  const affected = users.filter((u) => u.roleId === role.id);
  return Promise.all(
    affected.map((u) =>
      updateUser({ ...u, role: role.isAdmin ? "admin" : "collaborator", financeAccess: role.financeAccess, allowedViews: role.allowedViews }),
    ),
  );
}

export function useSaveRole() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { role: Partial<Role> & { name: string }; existing?: Role; users: TeamUser[] }) => {
      const role: Role = {
        id: input.existing?.id ?? newId("role"),
        name: input.role.name,
        isAdmin: input.role.isAdmin ?? false,
        financeAccess: input.role.financeAccess ?? false,
        allowedViews: input.role.allowedViews ?? null,
        createdAt: input.existing?.createdAt ?? new Date().toISOString(),
      };
      const saved = input.existing ? await updateRow(ROLES_TABLE, role) : await createRow(ROLES_TABLE, company.id, role);
      await applyRoleToUsers(saved, input.users);
      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROLES_TABLE, company.id] });
      queryClient.invalidateQueries({ queryKey: ["users", company.id] });
    },
  });
}

export function useDeleteRole() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeRow(ROLES_TABLE, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ROLES_TABLE, company.id] }),
  });
}

// Atribui (ou remove, com roleId=null) um perfil a um colaborador e já
// aplica as permissões daquele perfil nele imediatamente.
export function useAssignRole() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { user: TeamUser; role: Role | null }) => {
      const { user, role } = input;
      return updateUser({
        ...user,
        roleId: role?.id ?? null,
        role: role ? (role.isAdmin ? "admin" : "collaborator") : user.role,
        financeAccess: role ? role.financeAccess : user.financeAccess,
        allowedViews: role ? role.allowedViews : user.allowedViews,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users", company.id] }),
  });
}
