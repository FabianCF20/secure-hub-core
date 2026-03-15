// ==========================================
// FIREBASE CONFIGURATION
// ==========================================
// Inicializa Firebase con las credenciales del proyecto ainca-6cf4d.
// Las claves son PÚBLICAS (publishable keys).
// La seguridad se maneja con Firebase Auth + Firestore Security Rules.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAQc1oiccBE-Py1Nc2EXHVZ6jA6ZY7Ew_w",
  authDomain: "ainca-6cf4d.firebaseapp.com",
  projectId: "ainca-6cf4d",
  storageBucket: "ainca-6cf4d.firebasestorage.app",
  messagingSenderId: "327745320667",
  appId: "1:327745320667:web:571ba0963669f1387f7efe",
  measurementId: "G-6HVDMERTFK",
};

export const USE_FIREBASE = true;

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log("[Firebase] Inicializado con proyecto:", firebaseConfig.projectId);
