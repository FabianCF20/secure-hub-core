import { Form, FormField } from "@/models";
import { mockForms } from "@/data/mockData";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let forms = [...mockForms];

export const formService = {
  async getForms(): Promise<Form[]> {
    await delay(100);
    return [...forms];
  },

  async getFormById(formId: string): Promise<Form | undefined> {
    await delay(50);
    return forms.find(f => f.id === formId);
  },

  async getFormsByClient(clientId: string): Promise<Form[]> {
    await delay(100);
    return forms.filter(f => f.clientId === clientId);
  },

  async createForm(form: Omit<Form, "id" | "version">): Promise<Form> {
    await delay(150);
    const newForm: Form = {
      ...form,
      id: `form_${Date.now()}`,
      version: 1,
    };
    forms.push(newForm);
    return newForm;
  },

  async updateForm(formId: string, updates: Partial<Form>): Promise<Form> {
    await delay(100);
    const index = forms.findIndex(f => f.id === formId);
    if (index === -1) {
      throw new Error(`Form with id ${formId} not found`);
    }
    forms[index] = { ...forms[index], ...updates };
    return forms[index];
  },

  async incrementVersion(formId: string): Promise<Form> {
    await delay(100);
    const form = forms.find(f => f.id === formId);
    if (!form) {
      throw new Error(`Form with id ${formId} not found`);
    }
    return this.updateForm(formId, { version: form.version + 1 });
  },

  async cloneForm(formId: string, newName: string): Promise<Form> {
    await delay(150);
    const original = forms.find(f => f.id === formId);
    if (!original) {
      throw new Error(`Form with id ${formId} not found`);
    }
    
    const clonedFields: FormField[] = original.fields.map(field => ({
      ...field,
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }));

    const clonedForm: Form = {
      ...original,
      id: `form_${Date.now()}`,
      name: newName,
      version: 1,
      fields: clonedFields,
    };
    
    forms.push(clonedForm);
    return clonedForm;
  },

  async toggleFormStatus(formId: string): Promise<Form> {
    await delay(100);
    const form = forms.find(f => f.id === formId);
    if (!form) {
      throw new Error(`Form with id ${formId} not found`);
    }
    return this.updateForm(formId, { isActive: !form.isActive });
  },
};
