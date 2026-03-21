// ==========================================
// MODELO DE NOTIFICACIÓN
// ==========================================

export interface AppNotification {
  id: string;
  type: "record_created" | "record_approved" | "record_rejected" | "form_created" | "status_changed";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  metadata?: {
    recordId?: string;
    formId?: string;
    clientId?: string;
    userId?: string;
    status?: string;
  };
}
