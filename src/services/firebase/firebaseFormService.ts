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
import { Form, FormField } from "@/models";

function getFormsRef() {
  return collection(db!, COLLECTIONS.FORMS).withConverter(formConverter);
}

export const firebaseFormService = {
  async getForms(): Promise<Form[]> {
    const q = query(getFormsRef(), orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data());
  },

  async getFormById(formId: string): Promise<Form | undefined> {
    const docRef = doc(db!, COLLECTIONS.FORMS, formId).withConverter(formConverter);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : undefined;
  },

  async getFormsByClient(clientId: string): Promise<Form[]> {
    const q = query(getFormsRef(), where("clientId", "==", clientId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data());
  },

  async createForm(form: Omit<Form, "id" | "version">): Promise<Form> {
    const newForm = { ...form, version: 1 } as Form;
    const docRef = await addDoc(getFormsRef(), newForm);
    return { ...newForm, id: docRef.id };
  },

  async updateForm(formId: string, updates: Partial<Form>): Promise<Form> {
    const docRef = doc(db!, COLLECTIONS.FORMS, formId);
    await updateDoc(docRef, updates);
    const updated = await this.getFormById(formId);
    if (!updated) throw new Error(`Form ${formId} not found after update`);
    return updated;
  },

  async incrementVersion(formId: string): Promise<Form> {
    const form = await this.getFormById(formId);
    if (!form) throw new Error(`Form ${formId} not found`);
    return this.updateForm(formId, { version: form.version + 1 });
  },

  async cloneForm(formId: string, newName: string): Promise<Form> {
    const original = await this.getFormById(formId);
    if (!original) throw new Error(`Form ${formId} not found`);

    const clonedFields: FormField[] = original.fields.map((field) => ({
      ...field,
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }));

    const clonedForm: Omit<Form, "id" | "version"> = {
      name: newName,
      clientId: original.clientId,
      isActive: original.isActive,
      fields: clonedFields,
    };

    return this.createForm(clonedForm);
  },

  async toggleFormStatus(formId: string): Promise<Form> {
    const form = await this.getFormById(formId);
    if (!form) throw new Error(`Form ${formId} not found`);
    return this.updateForm(formId, { isActive: !form.isActive });
  },
};
