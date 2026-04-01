// ==========================================
// MODELOS DE DATOS - PANEL ADMINISTRATIVO
// Estructura compatible con Firebase Firestore
// ==========================================

// Tipos de roles del sistema
export type UserRole = "ADMIN" | "CENTRAL" | "SUPERVISOR" | "COORDINADOR" | "CLIENTE";

// Estados de registros
export type RecordStatus = "PENDING" | "SENT" | "REVIEW_COORD" | "REVIEW_ADMIN" | "APPROVED" | "REJECTED";

// Tipos de campos de formulario
export type FieldType = "text" | "number" | "select" | "checkbox" | "photo" | "signature" | "qr";

// ==========================================
// CLIENTE
// ==========================================
export interface Client {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

// ==========================================
// USUARIO
// ==========================================
export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  clientIds: string[];   // Array de clientes asignados (puede estar vacío)
  isActive: boolean;
}

// ==========================================
// VALIDACIONES DE CAMPO
// ==========================================
export interface FieldValidations {
  min?: number;
  max?: number;
  pattern?: string;
}

// ==========================================
// CAMPO DE FORMULARIO
// ==========================================
export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
  helperText?: string;
  validations?: FieldValidations;
}

// ==========================================
// FORMULARIO (PLANTILLA)
// ==========================================
export interface Form {
  id: string;
  name: string;
  clientId: string;
  version: number;
  isActive: boolean;
  fields: FormField[];
}

// ==========================================
// RESPUESTA DE CAMPO
// ==========================================
export interface FieldAnswer {
  fieldId: string;
  value: string;
}

// ==========================================
// EVIDENCIA DEL REGISTRO
// ==========================================
export interface RecordEvidence {
  photos: string[];
  signature: string;
  qrValue: string;
}

// ==========================================
// GEOLOCALIZACIÓN
// ==========================================
export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

// ==========================================
// LOG DE AUDITORÍA
// ==========================================
export type AuditAction = "created" | "status_changed" | "edited" | "approved" | "rejected";

export interface AuditLog {
  id: string;
  recordId: string;
  action: AuditAction;
  userId: string;
  userName: string;
  previousStatus?: RecordStatus;
  newStatus?: RecordStatus;
  observations?: string;
  timestamp: string;
}

// ==========================================
// REGISTRO DILIGENCIADO
// ==========================================
export interface Record {
  id: string;
  formId: string;
  clientId: string;
  userId: string;
  createdAt: string; // ISO 8601
  status: RecordStatus;
  answers: FieldAnswer[];
  evidence: RecordEvidence;
  observations: string;
  location?: GeoLocation;
  auditTrail?: AuditLog[];
}

// ==========================================
// CONFIGURACIÓN DEL SISTEMA
// ==========================================
export interface SystemConfig {
  companyName: string;
  companyLogo: string;
  primaryColor: string;
  secondaryColor: string;
  timezone: string;
  retentionDays: string;
  sessionDurationMinutes: string;
  language: string;
}

// ==========================================
// ESTADÍSTICAS DEL DASHBOARD
// ==========================================
export interface DashboardStats {
  totalClients: number;
  totalUsers: number;
  totalForms: number;
  totalRecords: number;
  recordsToday: number;
  pendingApproval: number;
}
