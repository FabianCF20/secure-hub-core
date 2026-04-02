import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { minuteEntryConverter } from "@/firebase/converters";
import { ensureFirebaseSession } from "@/lib/firebase-session";
import { MinuteEntry, AnnotationType, GeoLocation, UserRole } from "@/models";

const colRef = () =>
  collection(db, COLLECTIONS.MINUTE_ENTRIES).withConverter(minuteEntryConverter);

export const firebaseMinutaService = {
  /** Crear anotación (inmutable una vez creada) */
  async create(entry: Omit<MinuteEntry, "id">): Promise<string> {
    await ensureFirebaseSession();
    const docRef = await addDoc(colRef(), { id: "", ...entry } as MinuteEntry);
    return docRef.id;
  },

  /** Obtener entradas por clientId */
  async getByClient(clientId: string): Promise<MinuteEntry[]> {
    await ensureFirebaseSession();
    const q = query(colRef(), where("clientId", "==", clientId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  },

  /** Obtener todas las entradas (ADMIN/CENTRAL) */
  async getAll(): Promise<MinuteEntry[]> {
    const q = query(colRef(), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  },

  /** Obtener por múltiples clientIds */
  async getByClients(clientIds: string[]): Promise<MinuteEntry[]> {
    if (clientIds.length === 0) return [];
    const batches: MinuteEntry[] = [];
    // Firestore 'in' max 30
    for (let i = 0; i < clientIds.length; i += 30) {
      const chunk = clientIds.slice(i, i + 30);
      const q = query(colRef(), where("clientId", "in", chunk), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      batches.push(...snap.docs.map((d) => d.data()));
    }
    return batches.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /** Cerrar consigna general (solo CENTRAL/COORDINADOR) */
  async closeConsigna(entryId: string, closedBy: string, closedByName: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.MINUTE_ENTRIES, entryId);
    await updateDoc(docRef, {
      isClosed: true,
      closedBy,
      closedByName,
      closedAt: new Date().toISOString(),
    });
  },

  /** Listener en tiempo real */
  subscribe(
    clientIds: string[] | "all",
    callback: (entries: MinuteEntry[]) => void
  ): Unsubscribe {
    let q;
    if (clientIds === "all") {
      q = query(colRef(), orderBy("createdAt", "desc"));
    } else if (clientIds.length === 0) {
      callback([]);
      return () => {};
    } else {
      q = query(colRef(), where("clientId", "in", clientIds.slice(0, 30)), orderBy("createdAt", "desc"));
    }
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => d.data()));
    });
  },
};
