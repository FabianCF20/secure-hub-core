// ==========================================
// FIREBASE FORM SERVICE
// ==========================================
// Operaciones CRUD de formularios en Firestore.

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { formConverter } from "@/firebase/converters";
import { createUserFriendlyError } from "@/lib/firebase-error";
import { ensureFirebaseSession } from "@/lib/firebase-session";
import { Form, FormField } from "@/models";

function getFormsRef() {
  return collection(db!, COLLECTIONS.FORMS).withConverter(formConverter);
}

function validateFormPayload(form: Omit<Form, "id" | "version">) {
  if (!form.name.trim()) throw new Error("El nombre del formulario es obligatorio.");
  if (!form.clientId) throw new Error("Debes seleccionar un cliente para el formulario.");
  if (!form.fields.length) throw new Error("El formulario debe tener al menos un campo.");
  if (form.fields.some((field) => !field.label.trim())) {
    throw new Error("Todos los campos del formulario deben tener una etiqueta.");
  }
}

export const firebaseFormService = {
  async getForms(): Promise<Form[]> {
    try {
      await ensureFirebaseSession();
      const q = query(getFormsRef(), orderBy("name"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data());
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudieron cargar los formularios desde Firebase.");
    }
  },

  async getFormsByClientIds(clientIds: string[]): Promise<Form[]> {
    if (!clientIds.length) return [];
    try {
      await ensureFirebaseSession();
      const results: Form[] = [];
      for (let i = 0; i < clientIds.length; i += 30) {
        const batch = clientIds.slice(i, i + 30);
        const q = query(getFormsRef(), where("clientId", "in", batch));
        const snapshot = await getDocs(q);
        results.push(...snapshot.docs.map((d) => d.data()));
      }
      return results.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudieron cargar los formularios asignados.");
    }
  },

  async getFormById(formId: string): Promise<Form | undefined> {
    try {
      await ensureFirebaseSession();
      const docRef = doc(db!, COLLECTIONS.FORMS, formId).withConverter(formConverter);
      const snap = await getDoc(docRef);
      return snap.exists() ? snap.data() : undefined;
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudo consultar el formulario en Firebase.");
    }
  },

  async getFormsByClient(clientId: string): Promise<Form[]> {
    try {
      await ensureFirebaseSession();
      const q = query(getFormsRef(), where("clientId", "==", clientId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data());
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudieron cargar los formularios del cliente seleccionado.");
    }
  },

  async createForm(form: Omit<Form, "id" | "version">): Promise<Form> {
    try {
      await ensureFirebaseSession();
      validateFormPayload(form);

      const newForm = {
        ...form,
        name: form.name.trim(),
        version: 1,
      } as Form;

      const docRef = await addDoc(getFormsRef(), newForm);
      return { ...newForm, id: docRef.id };
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudo crear el formulario en Firestore.");
    }
  },

  async updateForm(formId: string, updates: Partial<Form>): Promise<Form> {
    try {
      await ensureFirebaseSession();
      const docRef = doc(db!, COLLECTIONS.FORMS, formId);
      await updateDoc(docRef, updates);
      const updated = await this.getFormById(formId);
      if (!updated) throw new Error(`No se encontró el formulario ${formId} después de actualizarlo.`);
      return updated;
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudo actualizar el formulario en Firestore.");
    }
  },

  async incrementVersion(formId: string): Promise<Form> {
    const form = await this.getFormById(formId);
    if (!form) throw new Error("El formulario que intentas versionar no existe.");
    return this.updateForm(formId, { version: form.version + 1 });
  },

  async cloneForm(formId: string, newName: string): Promise<Form> {
    const original = await this.getFormById(formId);
    if (!original) throw new Error("El formulario que intentas clonar no existe.");
    if (!newName.trim()) throw new Error("El nombre de la copia del formulario es obligatorio.");

    const clonedFields: FormField[] = original.fields.map((field) => ({
      ...field,
      id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    }));

    const clonedForm: Omit<Form, "id" | "version"> = {
      name: newName.trim(),
      clientId: original.clientId,
      isActive: original.isActive,
      fields: clonedFields,
    };

    return this.createForm(clonedForm);
  },

  async toggleFormStatus(formId: string): Promise<Form> {
    const form = await this.getFormById(formId);
    if (!form) throw new Error("El formulario que intentas cambiar de estado no existe.");
    return this.updateForm(formId, { isActive: !form.isActive });
  },
};
