import { UserRole } from "@/models";

const VALID_ROLES: UserRole[] = ["ADMIN", "CENTRAL", "ANALISTA", "SUPERVISOR", "COORDINADOR", "CLIENTE", "GUARDA"];

const LEGACY_ROLE_MAP: Record<string, UserRole> = {
  OPERATIVO: "GUARDA",
};

export function normalizeUserRole(role: string | null | undefined): UserRole | undefined {
  if (!role) return undefined;

  const normalizedInput = role.trim().toUpperCase();
  const mappedRole = LEGACY_ROLE_MAP[normalizedInput] ?? normalizedInput;

  return VALID_ROLES.includes(mappedRole as UserRole) ? (mappedRole as UserRole) : undefined;
}