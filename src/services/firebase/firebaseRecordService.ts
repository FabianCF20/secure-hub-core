// ==========================================
// FIREBASE RECORD SERVICE (with cache)
// ==========================================
import {
  collection, doc, getDocs, getDoc, updateDoc,
  query, where, orderBy,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { recordConverter } from "@/firebase/converters";
import { createUserFriendlyError } from "@/lib/firebase-error";
import { ensureFirebaseSession } from "@/lib/firebase-session";
import { cachedQuery, invalidateCache } from "@/lib/query-cache";
import { Record, RecordStatus } from "@/models";

function getRecordsRef() {
  return collection(db!, COLLECTIONS.RECORDS).withConverter(recordConverter);
}

export const firebaseRecordService = {
  async getRecords(): Promise<Record[]> {
    try {
      return await cachedQuery("records:all", async () => {
        await ensureFirebaseSession();
        const q = query(getRecordsRef(), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => doc.data());
      });
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudieron cargar los registros desde Firebase.");
    }
  },

  async getRecordById(recordId: string): Promise<Record | undefined> {
    try {
      await ensureFirebaseSession();
      const docRef = doc(db!, COLLECTIONS.RECORDS, recordId).withConverter(recordConverter);
      const snap = await getDoc(docRef);
      return snap.exists() ? snap.data() : undefined;
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudo consultar el registro en Firebase.");
    }
  },

  async getRecordsByClient(clientId: string): Promise<Record[]> {
    try {
      return await cachedQuery(`records:client:${clientId}`, async () => {
        await ensureFirebaseSession();
        const q = query(getRecordsRef(), where("clientId", "==", clientId), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => doc.data());
      });
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudieron cargar los registros del cliente seleccionado.");
    }
  },

  async getRecordsByForm(formId: string): Promise<Record[]> {
    try {
      return await cachedQuery(`records:form:${formId}`, async () => {
        await ensureFirebaseSession();
        const q = query(getRecordsRef(), where("formId", "==", formId), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => doc.data());
      });
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudieron cargar los registros del formulario seleccionado.");
    }
  },

  async getRecordsByUser(userId: string): Promise<Record[]> {
    try {
      return await cachedQuery(`records:user:${userId}`, async () => {
        await ensureFirebaseSession();
        const q = query(getRecordsRef(), where("userId", "==", userId), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => doc.data());
      });
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudieron cargar los registros del usuario seleccionado.");
    }
  },

  async getRecordsByStatus(status: RecordStatus): Promise<Record[]> {
    try {
      return await cachedQuery(`records:status:${status}`, async () => {
        await ensureFirebaseSession();
        const q = query(getRecordsRef(), where("status", "==", status), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => doc.data());
      });
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudieron cargar los registros por estado.");
    }
  },

  async createRecord(record: Omit<Record, "id">): Promise<Record> {
    try {
      const { callFunction } = await import("@/lib/callable-functions");
      const result = await callFunction<any, { success: boolean; record: Record }>("createRecord", {
        formId: record.formId,
        clientId: record.clientId,
        answers: record.answers,
        evidence: record.evidence,
        observations: record.observations,
        location: record.location,
      });
      invalidateCache("records:");
      console.log(`[Firebase] Registro creado vía Cloud Function: ${result.record.id}`);
      return result.record;
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudo guardar el registro.");
    }
  },

  async updateRecordStatus(recordId: string, status: RecordStatus, observations?: string): Promise<Record> {
    try {
      const { callFunction } = await import("@/lib/callable-functions");
      await callFunction("updateRecordStatus", { recordId, status, observations });
      invalidateCache("records:");
      const updated = await this.getRecordById(recordId);
      if (!updated) throw new Error(`No se encontró el registro ${recordId} después de actualizarlo.`);
      return updated;
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudo actualizar el estado del registro.");
    }
  },

  async getRecordsToday(): Promise<Record[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const records = await this.getRecords();
    return records.filter((r) => {
      const recordDate = new Date(r.createdAt);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });
  },

  async getPendingRecords(): Promise<Record[]> {
    const records = await this.getRecords();
    return records.filter((r) => r.status === "PENDING" || r.status === "SENT");
  },

  async getRecordsByClientIds(clientIds: string[]): Promise<Record[]> {
    if (!clientIds.length) return [];
    const cacheKey = `records:clientIds:${clientIds.sort().join(",")}`;
    try {
      return await cachedQuery(cacheKey, async () => {
        await ensureFirebaseSession();
        const results: Record[] = [];
        for (let i = 0; i < clientIds.length; i += 30) {
          const batch = clientIds.slice(i, i + 30);
          const q = query(getRecordsRef(), where("clientId", "in", batch), orderBy("createdAt", "desc"));
          const snapshot = await getDocs(q);
          results.push(...snapshot.docs.map((d) => d.data()));
        }
        return results;
      });
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudieron cargar los registros asignados.");
    }
  },
};
