import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/firebase/config";
import { callFunction } from "@/lib/callable-functions";
import type { IntelligenceReportInput } from "@/models";

export interface IntelligenceCaseSummary {
  id: string; caseNumber: string; clientId: string; createdBy: string;
  createdByName: string; assignedTo: string | null; status: string; createdAt: unknown;
}
export interface CreatedIntelligenceReport { success: boolean; caseId: string; reportId: string; caseNumber: string; }

export const firebaseIntelligenceService = {
  async createReport(input: IntelligenceReportInput): Promise<CreatedIntelligenceReport> {
    return callFunction<IntelligenceReportInput, CreatedIntelligenceReport>("createIntelligenceReport", input);
  },
  async getMyReports(userId: string) {
    const q = query(collection(db!, "intelligenceReports"), where("createdBy", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  },
  async getCases(): Promise<IntelligenceCaseSummary[]> {
    const q = query(collection(db!, "intelligenceCases"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as IntelligenceCaseSummary));
  },
};
