// ==========================================
// FIREBASE USER SERVICE
// ==========================================
// Operaciones CRUD de usuarios en Firestore + Firebase Auth.

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { userConverter } from "@/firebase/converters";
import { createUserFriendlyError, logError } from "@/lib/firebase-error";
import { ensureFirebaseSession } from "@/lib/firebase-session";
import { User } from "@/models";
import { firebaseAuthService } from "./firebaseAuthService";

function getUsersRef() {
  return collection(db!, COLLECTIONS.USERS).withConverter(userConverter);
}

export const firebaseUserService = {
  async getUsers(): Promise<User[]> {
    try {
      await ensureFirebaseSession();
      const q = query(getUsersRef(), orderBy("fullName"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data());
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudieron cargar los usuarios desde Firebase.");
    }
  },

  async getUserById(userId: string): Promise<User | undefined> {
    try {
      await ensureFirebaseSession();
      const docRef = doc(db!, COLLECTIONS.USERS, userId).withConverter(userConverter);
      const snap = await getDoc(docRef);
      return snap.exists() ? snap.data() : undefined;
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudo consultar el usuario en Firebase.");
    }
  },

  async getUsersByClient(clientId: string): Promise<User[]> {
    try {
      await ensureFirebaseSession();
      const q = query(getUsersRef(), where("clientIds", "array-contains", clientId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data());
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudieron cargar los usuarios del cliente seleccionado.");
    }
  },

  async createUser(userData: Omit<User, "id"> & { password?: string }): Promise<User> {
    if (!userData.password) throw new Error("La contraseña es obligatoria para crear el usuario.");
    if (!userData.fullName.trim()) throw new Error("El nombre completo del usuario es obligatorio.");
    if (!userData.email.trim()) throw new Error("El correo electrónico del usuario es obligatorio.");

    try {
      const { callFunction } = await import("@/lib/callable-functions");
      const result = await callFunction<any, { success: boolean; user: User }>("createUser", {
        fullName: userData.fullName,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        clientIds: userData.clientIds ?? [],
        isActive: userData.isActive,
      });
      console.log(`[Firebase] Usuario creado vía Cloud Function: ${result.user.id}`);
      return result.user;
    } catch (error) {
      logError("firebaseUserService.createUser", error);
      throw createUserFriendlyError(error, "No se pudo crear el usuario.");
    }
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    try {
      // Si se cambia el rol o clientIds, usar Cloud Function assignRole
      if (updates.role || updates.clientIds) {
        const { callFunction } = await import("@/lib/callable-functions");
        await callFunction("assignRole", {
          userId,
          ...(updates.role ? { role: updates.role } : {}),
          ...(updates.clientIds ? { clientIds: updates.clientIds } : {}),
        });
        // Remove role/clientIds from remaining updates
        const { role, clientIds, ...restUpdates } = updates;
        if (Object.keys(restUpdates).length > 0) {
          await ensureFirebaseSession();
          const docRef = doc(db!, COLLECTIONS.USERS, userId);
          await updateDoc(docRef, restUpdates);
        }
      } else {
        await ensureFirebaseSession();
        const docRef = doc(db!, COLLECTIONS.USERS, userId);
        await updateDoc(docRef, updates);
      }
      const updated = await this.getUserById(userId);
      if (!updated) throw new Error(`No se encontró el usuario ${userId} después de actualizarlo.`);
      return updated;
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudo actualizar el usuario.");
    }
  },

  async toggleUserStatus(userId: string): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("El usuario que intentas cambiar de estado no existe.");
    return this.updateUser(userId, { isActive: !user.isActive });
  },

  async deleteUser(userId: string): Promise<void> {
    try {
      await ensureFirebaseSession();
      const { deleteDoc } = await import("firebase/firestore");
      const docRef = doc(db!, COLLECTIONS.USERS, userId);
      await deleteDoc(docRef);
      console.log(`[Firebase] Usuario eliminado de Firestore: ${userId}`);
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudo eliminar el usuario de Firestore.");
    }
  },
};
