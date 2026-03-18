// ==========================================
// FIREBASE RECORD SERVICE
// ==========================================
// Operaciones CRUD de registros en Firestore.

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { recordConverter } from "@/firebase/converters";
import { createUserFriendlyError } from "@/lib/firebase-error";
import { ensureFirebaseSession } from "@/lib/firebase-session";
import { Record, RecordStatus } from "@/models";

function getRecordsRef() {
  return collection(db!, COLLECTIONS.RECORDS).withConverter(recordConverter);
}

export const firebaseRecordService = {
  async getRecords(): Promise<Record[]> {
    try {
      await ensureFirebaseSession();
      const q = query(getRecordsRef(), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data());
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
      await ensureFirebaseSession();
      const q = query(getRecordsRef(), where("clientId", "==", clientId), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data());
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudieron cargar los registros del cliente seleccionado.");
    }
  },

  async getRecordsByForm(formId: string): Promise<Record[]> {
    try {
      await ensureFirebaseSession();
      const q = query(getRecordsRef(), where("formId", "==", formId), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data());
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudieron cargar los registros del formulario seleccionado.");
    }
  },

  async getRecordsByUser(userId: string): Promise<Record[]> {
    try {
      await ensureFirebaseSession();
      const q = query(getRecordsRef(), where("userId", "==", userId), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data());
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudieron cargar los registros del usuario seleccionado.");
    }
  },

  async getRecordsByStatus(status: RecordStatus): Promise<Record[]> {
    try {
      await ensureFirebaseSession();
      const q = query(getRecordsRef(), where("status", "==", status), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data());
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudieron cargar los registros por estado.");
    }
  },

  async createRecord(record: Omit<Record, "id">): Promise<Record> {
    try {
      await ensureFirebaseSession();
      const docRef = await addDoc(getRecordsRef(), record as Record);
      return { ...record, id: docRef.id } as Record;
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudo guardar el registro en Firestore.");
    }
  },

  async updateRecordStatus(recordId: string, status: RecordStatus, observations?: string): Promise<Record> {
    try {
      await ensureFirebaseSession();
      const docRef = doc(db!, COLLECTIONS.RECORDS, recordId);
      const updates: Partial<Record> = { status };
      if (observations !== undefined) updates.observations = observations;
      await updateDoc(docRef, updates);
      const updated = await this.getRecordById(recordId);
      if (!updated) throw new Error(`No se encontró el registro ${recordId} después de actualizarlo.`);
      return updated;
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudo actualizar el estado del registro en Firestore.");
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
    try {
      await ensureFirebaseSession();
      const results: Record[] = [];
      for (let i = 0; i < clientIds.length; i += 30) {
        const batch = clientIds.slice(i, i + 30);
        const q = query(getRecordsRef(), where("clientId", "in", batch), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        results.push(...snapshot.docs.map((d) => d.data()));
      }
      return results;
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudieron cargar los registros asignados.");
    }
  },
};
