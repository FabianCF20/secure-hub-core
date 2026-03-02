// ==========================================
// SERVICE ADAPTER LAYER
// ==========================================
// Capa de abstracción que selecciona automáticamente entre
// servicios mock (desarrollo) y Firebase (producción).
// Cuando USE_FIREBASE es true, usa Firestore. Si no, usa mock data.

import { USE_FIREBASE } from "@/firebase/config";

// Mock services
import { authService as mockAuthService, type AuthCredentials } from "@/services/authService";
import { clientService as mockClientService } from "@/services/clientService";
import { userService as mockUserService } from "@/services/userService";
import { formService as mockFormService } from "@/services/formService";
import { recordService as mockRecordService } from "@/services/recordService";

// Firebase services
import { firebaseAuthService } from "@/services/firebase/firebaseAuthService";
import { firebaseClientService } from "@/services/firebase/firebaseClientService";
import { firebaseUserService } from "@/services/firebase/firebaseUserService";
import { firebaseFormService } from "@/services/firebase/firebaseFormService";
import { firebaseRecordService } from "@/services/firebase/firebaseRecordService";

// ==========================================
// Exportaciones adaptadas — el resto de la app importa desde aquí
// ==========================================

export const activeAuthService = USE_FIREBASE ? firebaseAuthService : mockAuthService;
export const activeClientService = USE_FIREBASE ? firebaseClientService : mockClientService;
export const activeUserService = USE_FIREBASE ? firebaseUserService : mockUserService;
export const activeFormService = USE_FIREBASE ? firebaseFormService : mockFormService;
export const activeRecordService = USE_FIREBASE ? firebaseRecordService : mockRecordService;

console.log(`[ServiceAdapter] Modo: ${USE_FIREBASE ? "🔥 Firebase" : "📦 Mock Data"}`);

export type { AuthCredentials };
