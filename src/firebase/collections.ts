// ==========================================
// FIREBASE COLLECTIONS - Nombres de colecciones
// ==========================================
// Centraliza los nombres de las colecciones de Firestore
// para evitar errores tipográficos y facilitar refactoring.

export const COLLECTIONS = {
  CLIENTS: "clients",
  USERS: "users",
  FORMS: "forms",
  RECORDS: "records",
  SYSTEM_CONFIG: "systemConfig",
  AUDIT_LOGS: "auditLogs",
} as const;

// Documento único para configuración del sistema
export const SYSTEM_CONFIG_DOC = "main";
