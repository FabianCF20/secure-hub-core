import {
  collection,
  doc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { createUserFriendlyError } from "@/lib/firebase-error";
import { ensureFirebaseSession } from "@/lib/firebase-session";
import { AuditLog } from "@/models";

function getAuditRef() {
  return collection(db!, COLLECTIONS.AUDIT_LOGS);
}

export const firebaseAuditService = {
  async addLog(log: Omit<AuditLog, "id">): Promise<AuditLog> {
    try {
      await ensureFirebaseSession();
      const docRef = await addDoc(getAuditRef(), log);
      return { ...log, id: docRef.id } as AuditLog;
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudo registrar el log de auditoría.");
    }
  },

  async getLogsByRecord(recordId: string): Promise<AuditLog[]> {
    try {
      await ensureFirebaseSession();
      const q = query(getAuditRef(), where("recordId", "==", recordId), orderBy("timestamp", "asc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog));
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudieron cargar los logs de auditoría.");
    }
  },
};
