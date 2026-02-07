import { User } from "@/models";
import { mockUsers } from "@/data/mockData";
import { authService } from "@/services/authService";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let users = [...mockUsers];

export const userService = {
  async getUsers(): Promise<User[]> {
    await delay(100);
    return [...users];
  },

  async getUserById(userId: string): Promise<User | undefined> {
    await delay(50);
    return users.find(u => u.id === userId);
  },

  async getUsersByClient(clientId: string): Promise<User[]> {
    await delay(100);
    return users.filter(u => u.clientId === clientId);
  },

  async createUser(userData: Omit<User, "id"> & { password?: string }): Promise<User> {
    await delay(150);
    
    // Simula creación en Firebase Auth
    const { password, ...userFields } = userData;
    console.log(`[Auth Simulado] Creando cuenta en Firebase Auth para: ${userData.email}`);
    const authUid = `auth_${Date.now()}`;
    console.log(`[Auth Simulado] UID generado: ${authUid}`);

    // Registra las credenciales en Auth para permitir login
    if (password) {
      authService.registerAuthAccount(userData.email, password);
    }
    
    // Crea el documento del usuario en la BDD (Firestore)
    const newUser: User = {
      ...userFields,
      id: authUid, // Usa el mismo UID del Auth como ID del documento
    };
    users.push(newUser);
    console.log(`[BDD Simulado] Usuario creado en colección users/ con ID: ${authUid}`);
    
    return newUser;
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    await delay(100);
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) {
      throw new Error(`User with id ${userId} not found`);
    }
    users[index] = { ...users[index], ...updates };
    return users[index];
  },

  async toggleUserStatus(userId: string): Promise<User> {
    await delay(100);
    const user = users.find(u => u.id === userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    return this.updateUser(userId, { isActive: !user.isActive });
  },
};
