// ==========================================
// FIREBASE AUTH SERVICE
// ==========================================
// Implementación real de autenticación con Firebase Auth.

import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { userConverter } from "@/firebase/converters";
import { User } from "@/models";
import { getErrorMessage, logError } from "@/lib/firebase-error";
import { AuthCredentials, AuthResult } from "@/services/serviceAdapter";

const AUTH_STORAGE_KEY = "secureops_auth_user";

function storeUserProfile(user: User) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

function clearStoredUserProfile() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export const firebaseAuthService = {
  async getUserProfile(uid: string): Promise<User | null> {
    if (!db) throw new Error("Firestore no está configurado correctamente.");

    const userDocRef = doc(db, COLLECTIONS.USERS, uid).withConverter(userConverter);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      clearStoredUserProfile();
      return null;
    }

    const userProfile = userSnap.data();
    storeUserProfile(userProfile);
    return userProfile;
  },

  async login(credentials: AuthCredentials): Promise<AuthResult> {
    if (!auth || !db) {
      return { success: false, error: "Firebase no está configurado correctamente." };
    }

    try {
      const { email, password } = credentials;
      console.log(`[Firebase Auth] Intentando login para: ${email}`);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log(`[Firebase Auth] Login exitoso, UID: ${firebaseUser.uid}`);

      const userProfile = await this.getUserProfile(firebaseUser.uid);

      if (!userProfile) {
        await signOut(auth);
        return { success: false, error: "El usuario existe en Firebase Auth pero no tiene perfil en Firestore." };
      }

      if (!userProfile.isActive) {
        await signOut(auth);
        return { success: false, error: "Tu cuenta está desactivada. Contacta al administrador." };
      }

      console.log(`[Firebase Auth] Login completo: ${userProfile.fullName} (${userProfile.role})`);
      return { success: true, user: userProfile };
    } catch (error) {
      logError("firebaseAuthService.login", error);
      return {
        success: false,
        error: getErrorMessage(error, "No fue posible iniciar sesión en Firebase."),
      };
    }
  },

  async logout(): Promise<void> {
    if (auth) {
      await signOut(auth);
    }

    clearStoredUserProfile();
    console.log("[Firebase Auth] Sesión cerrada");
  },

  getStoredUser(): User | null {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      clearStoredUserProfile();
      return null;
    }
  },

  clearStoredUser() {
    clearStoredUserProfile();
  },

  async createAuthAccount(email: string, password: string): Promise<string> {
    const { secondaryAuth } = await import("@/firebase/config");
    if (!secondaryAuth) throw new Error("Firebase Auth secundario no está configurado.");

    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = userCredential.user.uid;
    console.log(`[Firebase Auth] Cuenta creada con instancia secundaria, UID: ${uid}`);
    return uid;
  },

  async finalizeSecondaryAuthAccount(): Promise<void> {
    const { secondaryAuth } = await import("@/firebase/config");
    if (secondaryAuth?.currentUser) {
      await signOut(secondaryAuth);
    }
  },

  async rollbackSecondaryAuthAccount(): Promise<void> {
    const { secondaryAuth } = await import("@/firebase/config");

    try {
      if (secondaryAuth?.currentUser) {
        await deleteUser(secondaryAuth.currentUser);
      }
    } catch (error) {
      logError("firebaseAuthService.rollbackSecondaryAuthAccount.deleteUser", error);
    } finally {
      if (secondaryAuth?.currentUser) {
        await signOut(secondaryAuth).catch((error) => {
          logError("firebaseAuthService.rollbackSecondaryAuthAccount.signOut", error);
        });
      }
    }
  },

  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, callback);
  },
};
