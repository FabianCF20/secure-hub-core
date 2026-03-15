import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS, SYSTEM_CONFIG_DOC } from "@/firebase/collections";
import { SystemConfig } from "@/models";

const defaultConfig: SystemConfig = {
  companyName: "",
  companyLogo: "",
  primaryColor: "#1e3a5f",
  secondaryColor: "#3b82f6",
  timezone: "America/Bogota",
};

export const firebaseConfigService = {
  async getConfig(): Promise<SystemConfig> {
    const ref = doc(db, COLLECTIONS.SYSTEM_CONFIG, SYSTEM_CONFIG_DOC);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { ...defaultConfig, ...snap.data() } as SystemConfig;
    }
    return defaultConfig;
  },

  async saveConfig(config: SystemConfig): Promise<void> {
    const ref = doc(db, COLLECTIONS.SYSTEM_CONFIG, SYSTEM_CONFIG_DOC);
    await setDoc(ref, config, { merge: true });
  },
};
