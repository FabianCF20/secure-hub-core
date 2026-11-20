// ==========================================
// FIREBASE CLOUD FUNCTIONS — Operaciones Críticas
// ==========================================
// Solo escrituras sensibles pasan por aquí.
// Lecturas permanecen en el frontend para bajo costo.
// ==========================================

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// ==========================================
// TIPOS Y CONSTANTES
// ==========================================

type UserRole = "ADMIN" | "CENTRAL" | "SUPERVISOR" | "COORDINADOR" | "CLIENTE" | "GUARDA";

const VALID_ROLES: UserRole[] = ["ADMIN", "CENTRAL", "SUPERVISOR", "COORDINADOR", "CLIENTE", "GUARDA"];

const COLLECTIONS = {
  USERS: "users",
  CLIENTS: "clients",
  FORMS: "forms",
  RECORDS: "records",
  AUDIT_LOGS: "auditLogs",
};

// ==========================================
// HELPERS DE VALIDACIÓN
// ==========================================

/** Obtiene el perfil del usuario autenticado desde Firestore */
async function getCallerProfile(uid: string) {
  const snap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!snap.exists) throw new functions.https.HttpsError("not-found", "Perfil de usuario no encontrado.");
  return snap.data() as { role: UserRole; clientIds: string[]; isActive: boolean; fullName: string };
}

/** Verifica que el caller tenga uno de los roles permitidos */
function assertRole(callerRole: UserRole, allowed: UserRole[]) {
  if (!allowed.includes(callerRole)) {
    throw new functions.https.HttpsError("permission-denied", `Rol '${callerRole}' no tiene permiso para esta operación.`);
  }
}

/** Verifica que el usuario esté activo */
function assertActive(profile: { isActive: boolean }) {
  if (!profile.isActive) {
    throw new functions.https.HttpsError("permission-denied", "Tu cuenta está desactivada.");
  }
}

/** Sanitiza un string */
function sanitizeString(val: unknown, fieldName: string, maxLen = 255): string {
  if (typeof val !== "string" || !val.trim()) {
    throw new functions.https.HttpsError("invalid-argument", `El campo '${fieldName}' es obligatorio.`);
  }
  return val.trim().slice(0, maxLen);
}

/** Registra una acción de auditoría */
async function logAudit(action: string, userId: string, userName: string, details: Record<string, unknown>) {
  await db.collection(COLLECTIONS.AUDIT_LOGS).add({
    action,
    userId,
    userName,
    ...details,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ==========================================
// 1. CREATE USER (Solo ADMIN)
// ==========================================
export const createUser = functions.https.onCall(async (data, context) => {
  // Auth check
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const caller = await getCallerProfile(context.auth.uid);
  assertActive(caller);
  assertRole(caller.role, ["ADMIN"]);

  // Validate input
  const fullName = sanitizeString(data.fullName, "fullName", 100);
  const email = sanitizeString(data.email, "email", 255).toLowerCase();
  const password = sanitizeString(data.password, "password", 128);

  if (password.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "La contraseña debe tener al menos 6 caracteres.");
  }

  const role = data.role as UserRole;
  if (!VALID_ROLES.includes(role)) {
    throw new functions.https.HttpsError("invalid-argument", `Rol inválido: ${data.role}`);
  }

  const clientIds: string[] = Array.isArray(data.clientIds)
    ? data.clientIds.filter((id: unknown) => typeof id === "string" && id.trim())
    : [];

  // Validate clientIds exist
  for (const cid of clientIds) {
    const clientSnap = await db.collection(COLLECTIONS.CLIENTS).doc(cid).get();
    if (!clientSnap.exists) {
      throw new functions.https.HttpsError("invalid-argument", `Cliente '${cid}' no existe.`);
    }
  }

  // Create Auth account
  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: fullName,
    });
  } catch (error: any) {
    if (error.code === "auth/email-already-exists") {
      throw new functions.https.HttpsError("already-exists", "Ya existe un usuario con ese correo electrónico.");
    }
    throw new functions.https.HttpsError("internal", "Error al crear cuenta de autenticación.");
  }

  // Create Firestore profile
  const userProfile = {
    id: userRecord.uid,
    fullName,
    email,
    role,
    clientIds,
    isActive: data.isActive !== false,
  };

  try {
    await db.collection(COLLECTIONS.USERS).doc(userRecord.uid).set(userProfile);
  } catch (error) {
    // Rollback: delete Auth account if Firestore fails
    await admin.auth().deleteUser(userRecord.uid).catch(() => {});
    throw new functions.https.HttpsError("internal", "Error al guardar perfil del usuario.");
  }

  await logAudit("user_created", context.auth.uid, caller.fullName, {
    targetUserId: userRecord.uid,
    targetEmail: email,
    targetRole: role,
  });

  return { success: true, user: userProfile };
});

// ==========================================
// 2. ASSIGN ROLE (Solo ADMIN)
// ==========================================
export const assignRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const caller = await getCallerProfile(context.auth.uid);
  assertActive(caller);
  assertRole(caller.role, ["ADMIN"]);

  const targetUserId = sanitizeString(data.userId, "userId");
  const newRole = data.role as UserRole;

  if (!VALID_ROLES.includes(newRole)) {
    throw new functions.https.HttpsError("invalid-argument", `Rol inválido: ${data.role}`);
  }

  // Verify target user exists
  const targetSnap = await db.collection(COLLECTIONS.USERS).doc(targetUserId).get();
  if (!targetSnap.exists) {
    throw new functions.https.HttpsError("not-found", "El usuario objetivo no existe.");
  }

  const previousRole = targetSnap.data()?.role;

  // Update
  const updates: Record<string, unknown> = { role: newRole };

  // If clientIds provided, validate and update
  if (Array.isArray(data.clientIds)) {
    const clientIds = data.clientIds.filter((id: unknown) => typeof id === "string" && id.trim());
    for (const cid of clientIds) {
      const clientSnap = await db.collection(COLLECTIONS.CLIENTS).doc(cid).get();
      if (!clientSnap.exists) {
        throw new functions.https.HttpsError("invalid-argument", `Cliente '${cid}' no existe.`);
      }
    }
    updates.clientIds = clientIds;
  }

  await db.collection(COLLECTIONS.USERS).doc(targetUserId).update(updates);

  await logAudit("role_assigned", context.auth.uid, caller.fullName, {
    targetUserId,
    previousRole,
    newRole,
  });

  return { success: true };
});

// ==========================================
// 3. CREATE FORM (Solo ADMIN o CENTRAL)
// ==========================================
export const createForm = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const caller = await getCallerProfile(context.auth.uid);
  assertActive(caller);
  assertRole(caller.role, ["ADMIN", "CENTRAL"]);

  // Validate
  const name = sanitizeString(data.name, "name", 200);
  const clientId = sanitizeString(data.clientId, "clientId");

  // Verify client exists
  const clientSnap = await db.collection(COLLECTIONS.CLIENTS).doc(clientId).get();
  if (!clientSnap.exists) {
    throw new functions.https.HttpsError("invalid-argument", "El cliente seleccionado no existe.");
  }

  // Validate fields
  if (!Array.isArray(data.fields) || data.fields.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "El formulario debe tener al menos un campo.");
  }

  const validFieldTypes = ["text", "number", "select", "checkbox", "photo", "signature", "qr"];
  const sanitizedFields = data.fields.map((field: any, idx: number) => {
    const label = sanitizeString(field.label, `fields[${idx}].label`, 200);
    const type = field.type;
    if (!validFieldTypes.includes(type)) {
      throw new functions.https.HttpsError("invalid-argument", `Tipo de campo inválido: ${type}`);
    }
    return {
      id: field.id || `field_${Date.now()}_${idx}`,
      type,
      label,
      required: field.required === true,
      options: Array.isArray(field.options) ? field.options.filter((o: unknown) => typeof o === "string").slice(0, 50) : [],
      helperText: typeof field.helperText === "string" ? field.helperText.slice(0, 500) : "",
      ...(field.validations && typeof field.validations === "object" ? {
        validations: {
          ...(typeof field.validations.min === "number" ? { min: field.validations.min } : {}),
          ...(typeof field.validations.max === "number" ? { max: field.validations.max } : {}),
          ...(typeof field.validations.pattern === "string" ? { pattern: field.validations.pattern.slice(0, 200) } : {}),
        },
      } : {}),
    };
  });

  const formDoc = {
    name,
    clientId,
    version: 1,
    isActive: data.isActive !== false,
    fields: sanitizedFields,
  };

  const docRef = await db.collection(COLLECTIONS.FORMS).add(formDoc);

  await logAudit("form_created", context.auth.uid, caller.fullName, {
    formId: docRef.id,
    formName: name,
    clientId,
  });

  return { success: true, form: { ...formDoc, id: docRef.id } };
});

// ==========================================
// 4. CREATE RECORD (Solo SUPERVISOR o GUARDA)
// ==========================================
export const createRecord = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const caller = await getCallerProfile(context.auth.uid);
  assertActive(caller);
  assertRole(caller.role, ["SUPERVISOR", "GUARDA"]);

  // Validate
  const formId = sanitizeString(data.formId, "formId");
  const clientId = sanitizeString(data.clientId, "clientId");

  // Verify form exists
  const formSnap = await db.collection(COLLECTIONS.FORMS).doc(formId).get();
  if (!formSnap.exists) {
    throw new functions.https.HttpsError("invalid-argument", "El formulario no existe.");
  }

  const formData = formSnap.data();
  if (formData?.clientId !== clientId) {
    throw new functions.https.HttpsError("invalid-argument", "El formulario no pertenece al cliente indicado.");
  }

  // Verify caller has access to client
  if (!caller.clientIds.includes(clientId)) {
    throw new functions.https.HttpsError("permission-denied", "No tienes acceso al cliente de este formulario.");
  }

  // Sanitize answers
  const answers = Array.isArray(data.answers)
    ? data.answers.map((a: any) => ({
        fieldId: typeof a.fieldId === "string" ? a.fieldId.slice(0, 100) : "",
        value: typeof a.value === "string" ? a.value.slice(0, 5000) : "",
      }))
    : [];

  // Sanitize evidence
  const evidence = {
    photos: Array.isArray(data.evidence?.photos)
      ? data.evidence.photos.filter((p: unknown) => typeof p === "string").slice(0, 20)
      : [],
    signature: typeof data.evidence?.signature === "string" ? data.evidence.signature : "",
    qrValue: typeof data.evidence?.qrValue === "string" ? data.evidence.qrValue.slice(0, 500) : "",
  };

  const recordDoc = {
    formId,
    clientId,
    userId: context.auth.uid, // Forzado al caller, no al dato enviado
    createdAt: new Date().toISOString(),
    status: "PENDING",
    answers,
    evidence,
    observations: typeof data.observations === "string" ? data.observations.slice(0, 2000) : "",
    ...(data.location && typeof data.location === "object" ? {
      location: {
        latitude: Number(data.location.latitude) || 0,
        longitude: Number(data.location.longitude) || 0,
        ...(typeof data.location.accuracy === "number" ? { accuracy: data.location.accuracy } : {}),
        timestamp: new Date().toISOString(),
      },
    } : {}),
  };

  const docRef = await db.collection(COLLECTIONS.RECORDS).add(recordDoc);

  return { success: true, record: { ...recordDoc, id: docRef.id } };
});


// ==========================================
// 5. CREATE INTELLIGENCE CASE
// Recepción manual o desde fuentes internas.
// La asignación y el alcance se validan siempre en servidor.
// ==========================================
export const createIntelligenceCase = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const caller = await getCallerProfile(context.auth.uid);
  assertActive(caller);
  assertRole(caller.role, ["ADMIN", "CENTRAL", "COORDINADOR"]);

  const title = sanitizeString(data.title, "title", 180);
  const summary = typeof data.summary === "string" ? data.summary.trim().slice(0, 4000) : "";
  const clientId = sanitizeString(data.clientId, "clientId", 128);
  const classification = data.classification;
  const sourceType = data.sourceType;

  if (!["PUBLIC_INTERNAL", "CONFIDENTIAL", "RESTRICTED"].includes(classification)) {
    throw new functions.https.HttpsError("invalid-argument", "Clasificación de expediente inválida.");
  }
  if (!["INTERNAL", "MANUAL"].includes(sourceType)) {
    throw new functions.https.HttpsError("invalid-argument", "La fuente debe ser interna o manual.");
  }

  const clientSnap = await db.collection(COLLECTIONS.CLIENTS).doc(clientId).get();
  if (!clientSnap.exists) {
    throw new functions.https.HttpsError("not-found", "El cliente indicado no existe.");
  }
  if (caller.role === "COORDINADOR" && (!Array.isArray(caller.clientIds) || !caller.clientIds.includes(clientId))) {
    throw new functions.https.HttpsError("permission-denied", "No tienes acceso al cliente indicado.");
  }

  const requestedOwnerId = typeof data.ownerId === "string" && data.ownerId.trim()
    ? data.ownerId.trim()
    : context.auth.uid;
  const ownerSnap = await db.collection(COLLECTIONS.USERS).doc(requestedOwnerId).get();
  if (!ownerSnap.exists || ownerSnap.data()?.isActive !== true) {
    throw new functions.https.HttpsError("invalid-argument", "El responsable no existe o está inactivo.");
  }
  const owner = ownerSnap.data()!;
  if (!Array.isArray(owner.clientIds) || !owner.clientIds.includes(clientId)) {
    throw new functions.https.HttpsError("permission-denied", "El responsable no está asignado a este cliente.");
  }
  if (!["SUPERVISOR", "GUARDA", "COORDINADOR"].includes(owner.role)) {
    throw new functions.https.HttpsError("invalid-argument", "El responsable debe ser personal operativo o coordinador.");
  }

  const now = new Date().toISOString();
  const caseRef = db.collection("intelligenceCases").doc();
  const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();
  const caseData = {
    clientId,
    title,
    summary,
    classification,
    status: "OPEN",
    ownerId: requestedOwnerId,
    createdBy: context.auth.uid,
    createdAt: now,
    updatedAt: now,
    sourceType,
    entityIds: [],
    tags: [],
  };

  const batch = db.batch();
  batch.create(caseRef, caseData);
  batch.create(auditRef, {
    action: "intelligence_case_created",
    userId: context.auth.uid,
    userName: caller.fullName,
    targetId: caseRef.id,
    clientId,
    classification,
    sourceType,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return { success: true, case: { id: caseRef.id, ...caseData } };
});
