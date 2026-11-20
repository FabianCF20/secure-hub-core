import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/firebase/config";
import type { IntelligenceCase, IntelligenceClassification, IntelligenceSourceType } from "@/models/intelligence";

const functions = getFunctions(app);

interface CaseListResponse { cases: IntelligenceCase[] }
interface OwnerOption { id: string; fullName: string; role: string }

export const intelligenceService = {
  async listCases(): Promise<IntelligenceCase[]> {
    const call = httpsCallable<void, CaseListResponse>(functions, "listIntelligenceCases");
    const result = await call();
    return result.data.cases;
  },

  async listAssignableOwners(clientId: string): Promise<OwnerOption[]> {
    const call = httpsCallable<{ clientId: string }, { users: OwnerOption[] }>(
      functions,
      "listAssignableIntelligenceOwners"
    );
    const result = await call({ clientId });
    return result.data.users;
  },

  async createCase(input: {
    title: string;
    summary: string;
    clientId: string;
    ownerId: string;
    classification: IntelligenceClassification;
    sourceType: IntelligenceSourceType;
  }): Promise<IntelligenceCase> {
    const call = httpsCallable<typeof input, { success: boolean; case: IntelligenceCase }>(
      functions,
      "createIntelligenceCase"
    );
    const result = await call(input);
    return result.data.case;
  },
};
