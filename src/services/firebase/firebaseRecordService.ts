// ==========================================
// FIREBASE RECORD SERVICE
// ==========================================
// Operaciones CRUD de registros en Firestore.

import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { recordConverter } from "@/firebase/converters";
import { Record, RecordStatus } from "@/models";

function getRecordsRef() {
  return collection(db!, COLLECTIONS.RECORDS).withConverter(recordConverter);
}

export const firebaseRecordService = {
  async getRecords(): Promise<Record[]> {
    const q = query(getRecordsRef(), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data());
  },

  async getRecordById(recordId: string): Promise<Record | undefined> {
    const docRef = doc(db!, COLLECTIONS.RECORDS, recordId).withConverter(recordConverter);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : undefined;
  },

  async getRecordsByClient(clientId: string): Promise<Record[]> {
    const q = query(getRecordsRef(), where("clientId", "==", clientId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data());
  },

  async getRecordsByForm(formId: string): Promise<Record[]> {
    const q = query(getRecordsRef(), where("formId", "==", formId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data());
  },

  async getRecordsByUser(userId: string): Promise<Record[]> {
    const q = query(getRecordsRef(), where("userId", "==", userId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data());
  },

  async getRecordsByStatus(status: RecordStatus): Promise<Record[]> {
    const q = query(getRecordsRef(), where("status", "==", status), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data());
  },

  async updateRecordStatus(recordId: string, status: RecordStatus, observations?: string): Promise<Record> {
    const docRef = doc(db!, COLLECTIONS.RECORDS, recordId);
    const updates: any = { status };
    if (observations !== undefined) updates.observations = observations;
    await updateDoc(docRef, updates);
    const updated = await this.getRecordById(recordId);
    if (!updated) throw new Error(`Record ${recordId} not found after update`);
    return updated;
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
};
