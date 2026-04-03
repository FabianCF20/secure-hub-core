import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/models";

/**
 * Hook centralizado para lógica de permisos por rol.
 * Retorna helpers para verificar acceso y filtrar datos según el usuario autenticado.
 */
export function useRoleAccess() {
  const { user } = useAuth();
  const role = user?.role;
  const clientIds = user?.clientIds ?? [];

  const isAdmin = role === "ADMIN";
  const isCentral = role === "CENTRAL";
  const isSupervisor = role === "SUPERVISOR";
  const isCoordinador = role === "COORDINADOR";
  const isCliente = role === "CLIENTE";
  const isGuarda = role === "GUARDA";

  /** ¿Puede el usuario validar (aprobar/rechazar) registros? */
  const canValidate = isAdmin || isCentral || isCoordinador;

  /** ¿Puede crear formularios? */
  const canCreateForms = isAdmin || isCentral;

  /** ¿Puede gestionar usuarios? */
  const canManageUsers = isAdmin;

  /** ¿Puede gestionar clientes? */
  const canManageClients = isAdmin;

  /** ¿Tiene acceso global a todos los clientes? */
  const hasGlobalAccess = isAdmin || isCentral;

  /** ¿Puede diligenciar formularios? (Supervisor y Guarda) */
  const canFillForms = isSupervisor || isGuarda;

  /** Filtra un array de elementos que tengan clientId, según los permisos del usuario */
  function filterByClientAccess<T extends { clientId: string }>(items: T[]): T[] {
    if (hasGlobalAccess) return items;
    if (isCliente || isCoordinador || isSupervisor || isGuarda) {
      return items.filter((item) => clientIds.includes(item.clientId));
    }
    return [];
  }

  /** Verifica si el usuario tiene acceso a un clientId específico */
  function hasAccessToClient(clientId: string): boolean {
    if (hasGlobalAccess) return true;
    return clientIds.includes(clientId);
  }

  /** Verifica si el rol actual está incluido en una lista de roles permitidos */
  function hasRole(...allowedRoles: UserRole[]): boolean {
    return !!role && allowedRoles.includes(role);
  }

  return {
    user,
    role,
    clientIds,
    isAdmin,
    isCentral,
    isSupervisor,
    isCoordinador,
    isCliente,
    canValidate,
    canCreateForms,
    canManageUsers,
    canManageClients,
    hasGlobalAccess,
    filterByClientAccess,
    hasAccessToClient,
    hasRole,
  };
}
