import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";

export async function ensureFirebaseSession(): Promise<void> {
  if (!auth) {
    const error = new Error("Firebase Auth no está configurado correctamente.");
    (error as Error & { code?: string }).code = "auth/not-configured";
    throw error;
  }

  if (typeof auth.authStateReady === "function") {
    await auth.authStateReady();
  } else if (!auth.currentUser) {
    await new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, () => {
        unsubscribe();
        resolve();
      });
    });
  }

  if (!auth.currentUser) {
    const error = new Error("Tu sesión expiró o no está autenticada en Firebase.");
    (error as Error & { code?: string }).code = "auth/session-expired";
    throw error;
  }
}
