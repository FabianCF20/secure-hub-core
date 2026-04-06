// ==========================================
// CALLABLE FUNCTIONS WRAPPER
// ==========================================
// Wrapper para invocar Firebase Cloud Functions desde el frontend.
// Centraliza el manejo de errores de httpsCallable.

import { getFunctions, httpsCallable, HttpsCallableResult } from "firebase/functions";
import { app } from "@/firebase/config";

const functions = getFunctions(app);

/**
 * Invoca una Cloud Function callable con tipado y manejo de errores.
 */
export async function callFunction<TData, TResult>(
  functionName: string,
  data: TData
): Promise<TResult> {
  try {
    const fn = httpsCallable<TData, TResult>(functions, functionName);
    const result: HttpsCallableResult<TResult> = await fn(data);
    return result.data;
  } catch (error: any) {
    // Firebase Functions errors tienen code y message
    const message =
      error?.message || "Error al comunicarse con el servidor.";
    console.error(`[CloudFunction] Error en '${functionName}':`, error);
    throw new Error(message);
  }
}
