// ==========================================
// FIREBASE CLIENT SERVICE (with cache)
// ==========================================
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc,
  query, orderBy, where, documentId,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { clientConverter } from "@/firebase/converters";
import { createUserFriendlyError } from "@/lib/firebase-error";
import { ensureFirebaseSession } from "@/lib/firebase-session";
import { cachedQuery, invalidateCache } from "@/lib/query-cache";
import { Client } from "@/models";

function getClientsRef() {
  return collection(db!, COLLECTIONS.CLIENTS).withConverter(clientConverter);
}

export const firebaseClientService = {
  async getClients(): Promise<Client[]> {
    try {
      return await cachedQuery("clients:all", async () => {
        await ensureFirebaseSession();
        const q = query(getClientsRef(), orderBy("name"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => doc.data());
      });
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudieron cargar los clientes desde Firebase.");
    }
  },

  async getClientById(clientId: string): Promise<Client | undefined> {
    try {
      return await cachedQuery(`clients:id:${clientId}`, async () => {
        await ensureFirebaseSession();
        const docRef = doc(db!, COLLECTIONS.CLIENTS, clientId).withConverter(clientConverter);
        const snap = await getDoc(docRef);
        return snap.exists() ? snap.data() : undefined;
      });
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudo consultar el cliente en Firebase.");
    }
  },

  async createClient(client: Omit<Client, "id">): Promise<Client> {
    try {
      await ensureFirebaseSession();
      if (!client.name.trim()) throw new Error("El nombre del cliente es obligatorio.");
      if (!client.code.trim()) throw new Error("El código del cliente es obligatorio.");
      const payload: Omit<Client, "id"> = {
        ...client,
        name: client.name.trim(),
        code: client.code.trim().toUpperCase(),
      };
      const docRef = await addDoc(getClientsRef(), payload as Client);
      invalidateCache("clients:");
      return { ...payload, id: docRef.id };
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudo crear el cliente en Firestore.");
    }
  },

  async updateClient(clientId: string, updates: Partial<Client>): Promise<Client> {
    try {
      await ensureFirebaseSession();
      const docRef = doc(db!, COLLECTIONS.CLIENTS, clientId);
      await updateDoc(docRef, updates);
      invalidateCache("clients:");
      const updated = await this.getClientById(clientId);
      if (!updated) throw new Error(`No se encontró el cliente ${clientId} después de actualizarlo.`);
      return updated;
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudo actualizar el cliente en Firestore.");
    }
  },

  async getClientsByIds(clientIds: string[]): Promise<Client[]> {
    if (!clientIds.length) return [];
    const cacheKey = `clients:ids:${clientIds.sort().join(",")}`;
    try {
      return await cachedQuery(cacheKey, async () => {
        await ensureFirebaseSession();
        const results: Client[] = [];
        for (let i = 0; i < clientIds.length; i += 30) {
          const batch = clientIds.slice(i, i + 30);
          const q = query(getClientsRef(), where(documentId(), "in", batch));
          const snapshot = await getDocs(q);
          results.push(...snapshot.docs.map((d) => d.data()));
        }
        return results;
      });
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudieron cargar los clientes asignados.");
    }
  },

  async toggleClientStatus(clientId: string): Promise<Client> {
    const client = await this.getClientById(clientId);
    if (!client) throw new Error("El cliente que intentas cambiar de estado no existe.");
    invalidateCache("clients:");
    return this.updateClient(clientId, { isActive: !client.isActive });
  },
};
