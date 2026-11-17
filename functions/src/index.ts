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

type UserRole = "ADMIN" | "CENTRAL" | "ANALISTA" | "SUPERVISOR" | "COORDINADOR" | "CLIENTE" | "GUARDA";

const VALID_ROLES: UserRole[] = ["ADMIN", "CENTRAL", "ANALISTA", "SUPERVISOR", "COORDINADOR", "CLIENTE", "GUARDA"];

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
  // Las contraseñas se validan sin recortar espacios: pueden formar parte de la clave.
  const password = typeof data.password === "string" ? data.password : "";
  if (password.length < 6 || password.length > 128) {
    throw new functions.https.HttpsError("invalid-argument", "La contraseña debe tener entre 6 y 128 caracteres.");
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
 // 2B. DELETE USER (Solo ADMIN)
 // Elimina la cuenta de Authentication y su perfil.
 // Se conserva la trazabilidad histórica en los registros existentes.
 // ==========================================
export const deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const caller = await getCallerProfile(context.auth.uid);
  assertActive(caller);
  assertRole(caller.role, ["ADMIN"]);

  const targetUserId = sanitizeString(data.userId, "userId", 128);
  if (targetUserId === context.auth.uid) {
    throw new functions.https.HttpsError("failed-precondition", "No puedes eliminar tu propia cuenta.");
  }

  const targetRef = db.collection(COLLECTIONS.USERS).doc(targetUserId);
  const targetSnap = await targetRef.get();
  if (!targetSnap.exists) {
    throw new functions.https.HttpsError("not-found", "El perfil del usuario no existe.");
  }

  const target = targetSnap.data();
  try {
    await admin.auth().deleteUser(targetUserId);
  } catch (error: unknown) {
    const authErrorCode = typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;
    if (authErrorCode !== "auth/user-not-found") {
      throw new functions.https.HttpsError("internal", "No se pudo eliminar la cuenta de autenticación. El perfil se conservó.");
    }
  }

  try {
    await targetRef.delete();
  } catch (error) {
    // La cuenta Auth ya fue eliminada. El perfil se conserva para permitir
    // recuperación administrativa; no se oculta el fallo al cliente.
    throw new functions.https.HttpsError("internal", "La cuenta de acceso fue eliminada, pero no se pudo borrar el perfil. Contacta al administrador.");
  }

  await logAudit("user_deleted", context.auth.uid, caller.fullName, {
    targetUserId,
    targetEmail: target?.email ?? null,
    targetRole: target?.role ?? null,
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

  // La auditoría se registra desde servidor porque las reglas bloquean
  // escrituras directas del cliente en auditLogs.
  await logAudit("record_created", context.auth.uid, caller.fullName, {
    recordId: docRef.id,
    formId,
    clientId,
    status: recordDoc.status,
  });

  return { success: true, record: { ...recordDoc, id: docRef.id } };
});


// ==========================================
// 5. CREATE INTELLIGENCE REPORT + CASE
// Registro operativo y apertura atómica del expediente.
// El contenido es observacional; no determina culpabilidad.
// ==========================================
export const createIntelligenceReport = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const caller = await getCallerProfile(context.auth.uid);
  assertActive(caller);
  assertRole(caller.role, ["ADMIN", "CENTRAL", "SUPERVISOR", "COORDINADOR", "GUARDA"]);

  const clientId = sanitizeString(data.clientId, "clientId", 128);
  if (!["ADMIN", "CENTRAL"].includes(caller.role) && !(caller.clientIds || []).includes(clientId)) {
    throw new functions.https.HttpsError("permission-denied", "No tienes acceso al cliente seleccionado.");
  }

  const clientSnap = await db.collection(COLLECTIONS.CLIENTS).doc(clientId).get();
  if (!clientSnap.exists || clientSnap.data()?.isActive === false) {
    throw new functions.https.HttpsError("failed-precondition", "El cliente no existe o está inactivo.");
  }

  const observedAt = typeof data.observedAt === "string" ? data.observedAt.slice(0, 40) : new Date().toISOString();
  if (Number.isNaN(Date.parse(observedAt))) {
    throw new functions.https.HttpsError("invalid-argument", "La fecha del evento no es válida.");
  }

  const description = sanitizeString(data.description, "description", 5000);
  const behavior = typeof data.behavior === "string" ? data.behavior.trim().slice(0, 5000) : "";
  const clothing = typeof data.clothing === "string" ? data.clothing.trim().slice(0, 2000) : "";
  const physicalDescription = typeof data.physicalDescription === "string" ? data.physicalDescription.trim().slice(0, 2000) : "";
  const site = typeof data.site === "string" ? data.site.trim().slice(0, 200) : "";
  const post = typeof data.post === "string" ? data.post.trim().slice(0, 200) : "";
  const sourceType = typeof data.sourceType === "string" && ["direct_observation", "third_party_report"].includes(data.sourceType)
    ? data.sourceType : "direct_observation";

  const reportRef = db.collection("intelligenceReports").doc();
  const caseRef = db.collection("intelligenceCases").doc();
  const now = admin.firestore.FieldValue.serverTimestamp();

  const caseNumber = await db.runTransaction(async (tx) => {
    const counterRef = db.collection("systemCounters").doc("intelligenceCases");
    const counterSnap = await tx.get(counterRef);
    const next = (counterSnap.exists ? Number(counterSnap.data()?.value || 0) : 0) + 1;
    tx.set(counterRef, { value: next, updatedAt: now }, { merge: true });

    const generatedNumber = "INT-" + String(next).padStart(6, "0");
    const report = {
      caseId: caseRef.id,
      caseNumber: generatedNumber,
      clientId,
      createdBy: context.auth!.uid,
      createdByName: caller.fullName,
      creatorRole: caller.role,
      observedAt,
      createdAt: now,
      description,
      behavior,
      clothing,
      physicalDescription,
      site,
      post,
      sourceType,
      verificationStatus: "REPORTED",
      status: "PENDING",
    };
    const intelligenceCase = {
      caseNumber: generatedNumber,
      clientId,
      createdBy: context.auth!.uid,
      createdByName: caller.fullName,
      assignedTo: null,
      status: "PENDING",
      reportIds: [reportRef.id],
      createdAt: now,
      updatedAt: now,
      lastReviewedAt: null,
    };
    tx.create(reportRef, report);
    tx.create(caseRef, intelligenceCase);
    tx.create(db.collection("intelligenceTimeline").doc(), {
      caseId: caseRef.id,
      action: "CASE_CREATED",
      actorId: context.auth!.uid,
      actorName: caller.fullName,
      createdAt: now,
      note: "Expediente abierto automáticamente desde un reporte operativo.",
    });
    return generatedNumber;
  });

  await logAudit("intelligence_report_created", context.auth.uid, caller.fullName, {
    caseId: caseRef.id,
    caseNumber,
    reportId: reportRef.id,
    clientId,
  });

  return { success: true, caseId: caseRef.id, reportId: reportRef.id, caseNumber };
});
