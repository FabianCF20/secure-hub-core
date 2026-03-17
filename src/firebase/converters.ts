// ==========================================
// FIRESTORE DATA CONVERTERS
// ==========================================
// Converters tipados para transformar documentos de Firestore
// a las interfaces de TypeScript y viceversa.

import {
  FirestoreDataConverter,
  DocumentData,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from "firebase/firestore";
import { Client, User, Form, Record, SystemConfig } from "@/models";

/**
 * Elimina recursivamente todas las propiedades con valor `undefined`
 * para evitar el error `invalid-argument` de Firestore.
 */
function stripUndefined(obj: { [key: string]: any }): { [key: string]: any } {
  const clean: { [key: string]: any } = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      clean[key] = value.map((item) =>
        item !== null && typeof item === "object" && !Array.isArray(item)
          ? stripUndefined(item)
          : item
      );
    } else if (value !== null && typeof value === "object") {
      clean[key] = stripUndefined(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function createConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(item: T): DocumentData {
      const { id, ...data } = item as any;
      return stripUndefined(data);
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): T {
      const data = snapshot.data(options);
      return { id: snapshot.id, ...data } as T;
    },
  };
}

export const clientConverter = createConverter<Client>();
export const userConverter = createConverter<User>();
export const formConverter = createConverter<Form>();
export const recordConverter = createConverter<Record>();

export const systemConfigConverter: FirestoreDataConverter<SystemConfig> = {
  toFirestore(config: SystemConfig): DocumentData {
    return stripUndefined({ ...config } as any);
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): SystemConfig {
    return snapshot.data(options) as SystemConfig;
  },
};
