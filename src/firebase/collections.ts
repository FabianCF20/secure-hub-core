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
  MINUTE_ENTRIES: "minuteEntries",\n  INTELLIGENCE_CASES: "intelligenceCases",\n  INTELLIGENCE_REPORTS: "intelligenceReports",\n  INTELLIGENCE_TIMELINE: "intelligenceTimeline",\n  INTELLIGENCE_MATCHES: "intelligenceMatches",\n  INTELLIGENCE_VERIFICATIONS: "intelligenceVerifications",
} as const;

// Documento único para configuración del sistema
export const SYSTEM_CONFIG_DOC = "main";
