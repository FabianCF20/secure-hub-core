// ==========================================
// FIRESTORE DATA CONVERTERS
// ==========================================
// Converters tipados para transformar documentos de Firestore
// a las interfaces de TypeScript y viceversa.
// Esto garantiza type-safety en todas las operaciones CRUD.

import {
  FirestoreDataConverter,
  DocumentData,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from "firebase/firestore";
import { Client, User, Form, Record, SystemConfig } from "@/models";

function createConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(item: T): DocumentData {
      const { id, ...data } = item as any;
      return data;
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
    return { ...config };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): SystemConfig {
    return snapshot.data(options) as SystemConfig;
  },
};
