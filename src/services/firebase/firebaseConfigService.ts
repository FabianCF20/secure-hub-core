import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS, SYSTEM_CONFIG_DOC } from "@/firebase/collections";
import { createUserFriendlyError } from "@/lib/firebase-error";
import { ensureFirebaseSession } from "@/lib/firebase-session";
import { SystemConfig } from "@/models";

const defaultConfig: SystemConfig = {
  companyName: "",
  companyLogo: "",
  primaryColor: "#1e3a5f",
  secondaryColor: "#3b82f6",
  timezone: "America/Bogota",
  retentionDays: "365",
  sessionDurationMinutes: "480",
  language: "es",
};

export const firebaseConfigService = {
  async getConfig(): Promise<SystemConfig> {
    try {
      await ensureFirebaseSession();
      const ref = doc(db, COLLECTIONS.SYSTEM_CONFIG, SYSTEM_CONFIG_DOC);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return { ...defaultConfig, ...snap.data() } as SystemConfig;
      }
      return defaultConfig;
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudo cargar la configuración del sistema desde Firebase.");
    }
  },

  async saveConfig(config: SystemConfig): Promise<void> {
    try {
      await ensureFirebaseSession();
      const ref = doc(db, COLLECTIONS.SYSTEM_CONFIG, SYSTEM_CONFIG_DOC);
      await setDoc(ref, config, { merge: true });
    } catch (error) {
      throw createUserFriendlyError(error, "No se pudo guardar la configuración del sistema en Firestore.");
    }
  },
};
