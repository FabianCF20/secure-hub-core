import { FirebaseError } from "firebase/app";

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  "permission-denied": "Firebase rechazó la operación por permisos. Verifica tu rol y que tu sesión siga activa.",
  unauthenticated: "Tu sesión no es válida para operar en Firebase. Cierra sesión e inicia nuevamente.",
  "auth/session-expired": "Tu sesión expiró o todavía no terminó de cargarse. Inicia sesión de nuevo antes de continuar.",
  "auth/not-configured": "Firebase Auth no está configurado correctamente en este proyecto.",
  "auth/email-already-in-use": "El correo electrónico ya está registrado en Firebase Auth.",
  "auth/weak-password": "La contraseña es demasiado débil. Usa al menos 6 caracteres.",
  "auth/invalid-email": "El correo electrónico no es válido.",
  "auth/network-request-failed": "No se pudo conectar con Firebase. Revisa tu conexión a internet.",
  "auth/too-many-requests": "Firebase bloqueó temporalmente la operación por demasiados intentos. Intenta más tarde.",
  "auth/operation-not-allowed": "La operación no está habilitada en Firebase Auth para este proyecto.",
  "auth/requires-recent-login": "Firebase requiere que vuelvas a iniciar sesión para completar esta operación.",
  "failed-precondition": "Firebase requiere una configuración adicional para completar esta operación. Revisa reglas, índices o documentos relacionados.",
  "invalid-argument": "Hay datos inválidos en el formulario. Revisa los campos e inténtalo de nuevo.",
  "not-found": "El registro que intentas consultar o modificar ya no existe en la base de datos.",
  "already-exists": "Ya existe un registro con esos datos en Firebase.",
  unavailable: "Firebase no está disponible en este momento. Intenta nuevamente en unos segundos.",
  cancelled: "La operación fue cancelada antes de completarse.",
  "deadline-exceeded": "Firebase tardó demasiado en responder. Verifica la conexión e inténtalo de nuevo.",
  "resource-exhausted": "Firebase alcanzó un límite temporal para esta operación. Intenta nuevamente más tarde.",
};

function getErrorCode(error: unknown): string | undefined {
  if (error instanceof FirebaseError) return error.code;

  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code;
  }

  if (error instanceof Error) {
    if (error.message.includes("Missing or insufficient permissions")) return "permission-denied";
    if (error.message.includes("permission-denied")) return "permission-denied";
    if (error.message.includes("Unauthenticated")) return "unauthenticated";
  }

  return undefined;
}

export function getErrorMessage(error: unknown, fallback = "Ocurrió un error inesperado en Firebase."): string {
  const code = getErrorCode(error);

  if (code && FIREBASE_ERROR_MESSAGES[code]) {
    return FIREBASE_ERROR_MESSAGES[code];
  }

  if (error instanceof FirebaseError && error.message) {
    return `${fallback} Detalle técnico: ${error.message}`;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

export function createUserFriendlyError(error: unknown, fallback: string): Error {
  return new Error(getErrorMessage(error, fallback));
}

export function logError(context: string, error: unknown) {
  console.error(`[${context}]`, error);
}
