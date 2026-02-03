import { User } from "@/models";
import { mockUsers } from "@/data/mockData";

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

  async createUser(user: Omit<User, "id">): Promise<User> {
    await delay(150);
    const newUser: User = {
      ...user,
      id: `user_${Date.now()}`,
    };
    users.push(newUser);
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
