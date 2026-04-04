import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { useAuth } from "@/contexts/AuthContext";
import { AppNotification } from "@/models/notification";
import { Record as AppRecord, RecordStatus } from "@/models";

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function buildNotification(
  record: AppRecord,
  changeType: "added" | "modified",
  formNames: Map<string, string>,
  clientNames: Map<string, string>
): AppNotification {
  const formName = formNames.get(record.formId) || "Formulario";
  const clientName = clientNames.get(record.clientId) || "Cliente";

  const statusLabels: Record<RecordStatus, string> = {
    PENDING: "Pendiente", SENT: "Enviado", REVIEW_COORD: "En revisión Coordinador",
    REVIEW_ADMIN: "En revisión Admin", APPROVED: "Aprobado", REJECTED: "Rechazado",
  };

  const typeMap: Record<RecordStatus, AppNotification["type"]> = {
    PENDING: "record_created", SENT: "record_created", REVIEW_COORD: "status_changed",
    REVIEW_ADMIN: "status_changed", APPROVED: "record_approved", REJECTED: "record_rejected",
  };

  const isNew = changeType === "added";
  const title = isNew ? `Nuevo registro: ${formName}` : `Estado actualizado: ${statusLabels[record.status]}`;
  const message = isNew
    ? `Se ha creado un registro de "${formName}" para ${clientName}`
    : `El registro de "${formName}" cambió a ${statusLabels[record.status]}`;

  return {
    id: `${record.id}-${Date.now()}`,
    type: typeMap[record.status] || "status_changed",
    title, message,
    timestamp: new Date().toISOString(),
    read: false,
    link: `/records/${record.id}`,
    metadata: { recordId: record.id, formId: record.formId, clientId: record.clientId, userId: record.userId, status: record.status },
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  // Use refs for name maps to avoid re-subscribing record listener when maps update
  const formNamesRef = useRef<Map<string, string>>(new Map());
  const clientNamesRef = useRef<Map<string, string>>(new Map());

  // Load form/client name maps (lightweight, rarely changes)
  useEffect(() => {
    if (!isAuthenticated || !db) return;

    const unsubForms = onSnapshot(collection(db, COLLECTIONS.FORMS), (snap) => {
      const map = new Map<string, string>();
      snap.docs.forEach((d) => map.set(d.id, (d.data() as { name?: string }).name || "Formulario"));
      formNamesRef.current = map;
    });

    const unsubClients = onSnapshot(collection(db, COLLECTIONS.CLIENTS), (snap) => {
      const map = new Map<string, string>();
      snap.docs.forEach((d) => map.set(d.id, (d.data() as { name?: string }).name || "Cliente"));
      clientNamesRef.current = map;
    });

    return () => { unsubForms(); unsubClients(); };
  }, [isAuthenticated]);

  // Listen to records — stable deps, no re-subscribe on name map changes
  useEffect(() => {
    if (!isAuthenticated || !user || !db) return;

    const isGlobal = user.role === "ADMIN" || user.role === "CENTRAL";
    let q;

    if (isGlobal) {
      q = query(collection(db, COLLECTIONS.RECORDS), orderBy("createdAt", "desc"), limit(50));
    } else if (user.clientIds?.length) {
      const ids = user.clientIds.slice(0, 30);
      q = query(collection(db, COLLECTIONS.RECORDS), where("clientId", "in", ids), orderBy("createdAt", "desc"), limit(50));
    } else {
      return;
    }

    let isFirst = true;

    const unsub = onSnapshot(q, (snapshot) => {
      if (isFirst) { isFirst = false; return; }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          const data = change.doc.data();
          const record: AppRecord = {
            id: change.doc.id,
            formId: data.formId || "", clientId: data.clientId || "",
            userId: data.userId || "", createdAt: data.createdAt || new Date().toISOString(),
            status: data.status || "PENDING", answers: data.answers || [],
            evidence: data.evidence || { photos: [], signature: "", qrValue: "" },
            observations: data.observations || "",
          };
          const notification = buildNotification(record, change.type, formNamesRef.current, clientNamesRef.current);
          setNotifications((prev) => [notification, ...prev].slice(0, 50));
        }
      });
    }, (error) => {
      console.error("[Notifications] Error en listener:", error);
    });

    return () => unsub();
  }, [isAuthenticated, user?.id, user?.role]); // Stable deps only

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => { setNotifications([]); }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications debe usarse dentro de un NotificationProvider");
  return context;
}
