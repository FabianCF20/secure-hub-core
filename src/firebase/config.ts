// ==========================================
// FIREBASE CONFIGURATION
// ==========================================
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
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

// Enable offline persistence to reduce reads and support offline usage
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  }),
});

export const storage = getStorage(app);

// Secondary app for creating users without affecting current session
export const secondaryApp = initializeApp(firebaseConfig, "secondary");
export const secondaryAuth = getAuth(secondaryApp);

console.log("[Firebase] Inicializado con persistencia offline habilitada");
