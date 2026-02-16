// ==========================================
// FIREBASE CLIENT SERVICE
// ==========================================
// Operaciones CRUD de clientes en Firestore.

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { clientConverter } from "@/firebase/converters";
import { Client } from "@/models";

function getClientsRef() {
  return collection(db!, COLLECTIONS.CLIENTS).withConverter(clientConverter);
}

export const firebaseClientService = {
  async getClients(): Promise<Client[]> {
    const q = query(getClientsRef(), orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data());
  },

  async getClientById(clientId: string): Promise<Client | undefined> {
    const docRef = doc(db!, COLLECTIONS.CLIENTS, clientId).withConverter(clientConverter);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : undefined;
  },

  async createClient(client: Omit<Client, "id">): Promise<Client> {
    const docRef = await addDoc(getClientsRef(), client as Client);
    return { ...client, id: docRef.id };
  },

  async updateClient(clientId: string, updates: Partial<Client>): Promise<Client> {
    const docRef = doc(db!, COLLECTIONS.CLIENTS, clientId);
    await updateDoc(docRef, updates);
    const updated = await this.getClientById(clientId);
    if (!updated) throw new Error(`Client ${clientId} not found after update`);
    return updated;
  },

  async toggleClientStatus(clientId: string): Promise<Client> {
    const client = await this.getClientById(clientId);
    if (!client) throw new Error(`Client ${clientId} not found`);
    return this.updateClient(clientId, { isActive: !client.isActive });
  },
};
