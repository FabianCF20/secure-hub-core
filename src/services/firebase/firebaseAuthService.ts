// ==========================================
// FIREBASE AUTH SERVICE
// ==========================================
// Implementación real de autenticación con Firebase Auth.
// Se activa automáticamente cuando USE_FIREBASE = true.

import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { userConverter } from "@/firebase/converters";
import { User } from "@/models";
import { AuthCredentials, AuthResult } from "@/services/authService";

const AUTH_STORAGE_KEY = "secureops_auth_user";

export const firebaseAuthService = {
  /**
   * Login con Firebase Auth + carga de perfil desde Firestore
   */
  async login(credentials: AuthCredentials): Promise<AuthResult> {
    if (!auth || !db) {
      return { success: false, error: "Firebase no está configurado" };
    }

    try {
      const { email, password } = credentials;
      console.log(`[Firebase Auth] Intentando login para: ${email}`);

      // Paso 1: Autenticar con Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log(`[Firebase Auth] Login exitoso, UID: ${firebaseUser.uid}`);

      // Paso 2: Obtener perfil desde Firestore usando el UID
      const userDocRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid).withConverter(userConverter);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        console.log(`[Firebase Auth] Perfil no encontrado en Firestore`);
        await signOut(auth);
        return { success: false, error: "Perfil de usuario no encontrado en la base de datos" };
      }

      const userProfile = userSnap.data();

      if (!userProfile.isActive) {
        console.log(`[Firebase Auth] Usuario desactivado`);
        await signOut(auth);
        return { success: false, error: "Tu cuenta está desactivada. Contacta al administrador" };
      }

      // Guardar perfil en localStorage para acceso rápido
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userProfile));
      console.log(`[Firebase Auth] Login completo: ${userProfile.fullName} (${userProfile.role})`);

      return { success: true, user: userProfile };
    } catch (error: any) {
      console.error(`[Firebase Auth] Error:`, error.code);
      
      const errorMessages: Record<string, string> = {
        "auth/user-not-found": "No existe una cuenta con este correo electrónico",
        "auth/wrong-password": "Contraseña incorrecta",
        "auth/invalid-email": "Correo electrónico inválido",
        "auth/user-disabled": "Tu cuenta está desactivada",
        "auth/too-many-requests": "Demasiados intentos. Intenta más tarde",
        "auth/invalid-credential": "Credenciales inválidas",
      };

      return {
        success: false,
        error: errorMessages[error.code] || "Error de autenticación: " + error.message,
      };
    }
  },

  /**
   * Cerrar sesión en Firebase Auth
   */
  async logout(): Promise<void> {
    if (auth) {
      await signOut(auth);
    }
    localStorage.removeItem(AUTH_STORAGE_KEY);
    console.log(`[Firebase Auth] Sesión cerrada`);
  },

  /**
   * Recuperar sesión almacenada
   */
  getStoredUser(): User | null {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  },

  /**
   * Crear cuenta en Firebase Auth (usado al crear usuarios desde el panel)
   */
  async createAuthAccount(email: string, password: string): Promise<string> {
    if (!auth) throw new Error("Firebase no está configurado");

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log(`[Firebase Auth] Cuenta creada, UID: ${userCredential.user.uid}`);
    return userCredential.user.uid;
  },

  /**
   * Listener de cambios de estado de autenticación
   */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, callback);
  },
};
