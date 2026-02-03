import { Client } from "@/models";
import { mockClients } from "@/data/mockData";

// Simulated delay to mimic API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// In-memory data store (simulating Firestore)
let clients = [...mockClients];

export const clientService = {
  async getClients(): Promise<Client[]> {
    await delay(100);
    return [...clients];
  },

  async getClientById(clientId: string): Promise<Client | undefined> {
    await delay(50);
    return clients.find(c => c.id === clientId);
  },

  async createClient(client: Omit<Client, "id">): Promise<Client> {
    await delay(150);
    const newClient: Client = {
      ...client,
      id: `client_${Date.now()}`,
    };
    clients.push(newClient);
    return newClient;
  },

  async updateClient(clientId: string, updates: Partial<Client>): Promise<Client> {
    await delay(100);
    const index = clients.findIndex(c => c.id === clientId);
    if (index === -1) {
      throw new Error(`Client with id ${clientId} not found`);
    }
    clients[index] = { ...clients[index], ...updates };
    return clients[index];
  },

  async toggleClientStatus(clientId: string): Promise<Client> {
    await delay(100);
    const client = clients.find(c => c.id === clientId);
    if (!client) {
      throw new Error(`Client with id ${clientId} not found`);
    }
    return this.updateClient(clientId, { isActive: !client.isActive });
  },
};
