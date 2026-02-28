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
import { User } from "@/models";
import { firebaseAuthService } from "./firebaseAuthService";

function getUsersRef() {
  return collection(db!, COLLECTIONS.USERS).withConverter(userConverter);
}

export const firebaseUserService = {
  async getUsers(): Promise<User[]> {
    const q = query(getUsersRef(), orderBy("fullName"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data());
  },

  async getUserById(userId: string): Promise<User | undefined> {
    const docRef = doc(db!, COLLECTIONS.USERS, userId).withConverter(userConverter);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : undefined;
  },

  async getUsersByClient(clientId: string): Promise<User[]> {
    const q = query(getUsersRef(), where("clientIds", "array-contains", clientId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data());
  },

  async createUser(userData: Omit<User, "id"> & { password?: string }): Promise<User> {
    const { password, ...userFields } = userData;

    // Paso 1: Crear cuenta en Firebase Auth
    if (!password) throw new Error("La contraseña es obligatoria para crear un usuario");
    const authUid = await firebaseAuthService.createAuthAccount(userData.email, password);

    // Paso 2: Crear documento en Firestore con el mismo UID
    const newUser: User = { ...userFields, id: authUid };
    const userDocRef = doc(db!, COLLECTIONS.USERS, authUid).withConverter(userConverter);
    await setDoc(userDocRef, newUser);

    console.log(`[Firebase] Usuario creado en Auth + Firestore con UID: ${authUid}`);
    return newUser;
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const docRef = doc(db!, COLLECTIONS.USERS, userId);
    await updateDoc(docRef, updates);
    const updated = await this.getUserById(userId);
    if (!updated) throw new Error(`User ${userId} not found after update`);
    return updated;
  },

  async toggleUserStatus(userId: string): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error(`User ${userId} not found`);
    return this.updateUser(userId, { isActive: !user.isActive });
  },
};
