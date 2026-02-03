import { Record, RecordStatus } from "@/models";
import { mockRecords } from "@/data/mockData";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let records = [...mockRecords];

export const recordService = {
  async getRecords(): Promise<Record[]> {
    await delay(100);
    return [...records].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async getRecordById(recordId: string): Promise<Record | undefined> {
    await delay(50);
    return records.find(r => r.id === recordId);
  },

  async getRecordsByClient(clientId: string): Promise<Record[]> {
    await delay(100);
    return records
      .filter(r => r.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getRecordsByForm(formId: string): Promise<Record[]> {
    await delay(100);
    return records
      .filter(r => r.formId === formId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getRecordsByUser(userId: string): Promise<Record[]> {
    await delay(100);
    return records
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getRecordsByStatus(status: RecordStatus): Promise<Record[]> {
    await delay(100);
    return records
      .filter(r => r.status === status)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async updateRecordStatus(
    recordId: string, 
    status: RecordStatus, 
    observations?: string
  ): Promise<Record> {
    await delay(100);
    const index = records.findIndex(r => r.id === recordId);
    if (index === -1) {
      throw new Error(`Record with id ${recordId} not found`);
    }
    
    records[index] = { 
      ...records[index], 
      status,
      observations: observations ?? records[index].observations,
    };
    
    return records[index];
  },

  async getRecordsToday(): Promise<Record[]> {
    await delay(100);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return records.filter(r => {
      const recordDate = new Date(r.createdAt);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });
  },

  async getPendingRecords(): Promise<Record[]> {
    await delay(100);
    return records.filter(r => r.status === "PENDING" || r.status === "SENT");
  },
};
