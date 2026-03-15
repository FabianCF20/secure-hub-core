// ==========================================
// SERVICE ADAPTER LAYER
// ==========================================
// Exporta los servicios de Firebase como únicos servicios activos.
// Ya no existe fallback a datos mock.

import { firebaseAuthService } from "@/services/firebase/firebaseAuthService";
import { firebaseClientService } from "@/services/firebase/firebaseClientService";
import { firebaseUserService } from "@/services/firebase/firebaseUserService";
import { firebaseFormService } from "@/services/firebase/firebaseFormService";
import { firebaseRecordService } from "@/services/firebase/firebaseRecordService";

export const activeAuthService = firebaseAuthService;
export const activeClientService = firebaseClientService;
export const activeUserService = firebaseUserService;
export const activeFormService = firebaseFormService;
export const activeRecordService = firebaseRecordService;

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: import("@/models").User;
  error?: string;
}

console.log("[ServiceAdapter] Modo: 🔥 Firebase");
