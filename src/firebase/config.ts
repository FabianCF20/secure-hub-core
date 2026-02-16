// ==========================================
// FIREBASE CONFIGURATION
// ==========================================
// Este archivo inicializa Firebase con las credenciales del proyecto.
// Las claves de configuración de Firebase son PÚBLICAS (publishable keys),
// la seguridad se maneja con Firebase Auth + Firestore Security Rules.
//
// INSTRUCCIONES:
// 1. Reemplaza los valores de firebaseConfig con los de tu proyecto Firebase
// 2. Ve a Firebase Console → Project Settings → General → Your apps → SDK snippet
// 3. Copia los valores y pégalos aquí
// ==========================================

import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// ⚠️ REEMPLAZA estos valores con los de tu proyecto Firebase
// Estas claves son PÚBLICAS y seguras para incluir en el código del cliente.
// La seguridad se garantiza mediante Firebase Auth + Security Rules.
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
};

// Flag para determinar si usar Firebase real o datos mock
// Cambia a true cuando tengas la configuración de Firebase lista
export const USE_FIREBASE = firebaseConfig.apiKey !== "TU_API_KEY_AQUI";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (USE_FIREBASE) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log("[Firebase] Inicializado correctamente con proyecto:", firebaseConfig.projectId);
} else {
  console.log("[Firebase] Usando datos mock — configura firebaseConfig para conectar a Firebase");
}

export { app, auth, db, storage };
