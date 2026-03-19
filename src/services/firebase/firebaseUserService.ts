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
    await ensureFirebaseSession();

    const { password, ...userFields } = userData;
    if (!password) throw new Error("La contraseña es obligatoria para crear el usuario.");
    if (!userFields.fullName.trim()) throw new Error("El nombre completo del usuario es obligatorio.");
    if (!userFields.email.trim()) throw new Error("El correo electrónico del usuario es obligatorio.");

    let authUid: string | null = null;

    try {
      authUid = await firebaseAuthService.createAuthAccount(userData.email.trim(), password);
      const newUser: User = {
        ...userFields,
        id: authUid,
        fullName: userFields.fullName.trim(),
        email: userFields.email.trim().toLowerCase(),
        clientIds: userFields.clientIds ?? [],
      };

      const userDocRef = doc(db!, COLLECTIONS.USERS, authUid).withConverter(userConverter);
      await setDoc(userDocRef, newUser);
      console.log(`[Firebase] Usuario creado en Auth + Firestore con UID: ${authUid}`);
      return newUser;
    } catch (error) {
      logError("firebaseUserService.createUser", error);
      if (authUid) {
        await firebaseAuthService.rollbackSecondaryAuthAccount();
      }
      throw createUserFriendlyError(error, "No se pudo crear el usuario en Firebase Auth y Firestore.");
    } finally {
      await firebaseAuthService.finalizeSecondaryAuthAccount().catch((error) => {
        logError("firebaseUserService.createUser.finalizeSecondaryAuthAccount", error);
      });
    }
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    try {
      await ensureFirebaseSession();
      const docRef = doc(db!, COLLECTIONS.USERS, userId);
      await updateDoc(docRef, updates);
      const updated = await this.getUserById(userId);
      if (!updated) throw new Error(`No se encontró el usuario ${userId} después de actualizarlo.`);
      return updated;
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudo actualizar el usuario en Firestore.");
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
