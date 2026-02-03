import { DashboardStats } from "@/models";
import { clientService } from "./clientService";
import { userService } from "./userService";
import { formService } from "./formService";
import { recordService } from "./recordService";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    await delay(100);
    
    const [clients, users, forms, records, recordsToday, pendingRecords] = await Promise.all([
      clientService.getClients(),
      userService.getUsers(),
      formService.getForms(),
      recordService.getRecords(),
      recordService.getRecordsToday(),
      recordService.getPendingRecords(),
    ]);

    return {
      totalClients: clients.filter(c => c.isActive).length,
      totalUsers: users.filter(u => u.isActive).length,
      totalForms: forms.filter(f => f.isActive).length,
      totalRecords: records.length,
      recordsToday: recordsToday.length,
      pendingApproval: pendingRecords.length,
    };
  },

  async getRecordsByClientChart(): Promise<{ name: string; value: number }[]> {
    await delay(100);
    
    const [clients, records] = await Promise.all([
      clientService.getClients(),
      recordService.getRecords(),
    ]);

    return clients.map(client => ({
      name: client.name.length > 20 ? client.name.substring(0, 20) + "..." : client.name,
      value: records.filter(r => r.clientId === client.id).length,
    })).filter(item => item.value > 0);
  },

  async getRecordsByFormChart(): Promise<{ name: string; value: number }[]> {
    await delay(100);
    
    const [forms, records] = await Promise.all([
      formService.getForms(),
      recordService.getRecords(),
    ]);

    return forms.map(form => ({
      name: form.name.length > 25 ? form.name.substring(0, 25) + "..." : form.name,
      value: records.filter(r => r.formId === form.id).length,
    })).filter(item => item.value > 0);
  },

  async getRecordsByStatusChart(): Promise<{ name: string; value: number; color: string }[]> {
    await delay(100);
    
    const records = await recordService.getRecords();
    
    const statusMap = {
      PENDING: { name: "Pendiente", color: "hsl(var(--warning))" },
      SENT: { name: "Enviado", color: "hsl(var(--info))" },
      APPROVED: { name: "Aprobado", color: "hsl(var(--success))" },
      REJECTED: { name: "Rechazado", color: "hsl(var(--destructive))" },
    };

    return Object.entries(statusMap).map(([status, config]) => ({
      name: config.name,
      value: records.filter(r => r.status === status).length,
      color: config.color,
    }));
  },

  async getRecentActivity(): Promise<{
    id: string;
    type: "record" | "form" | "user";
    description: string;
    timestamp: string;
  }[]> {
    await delay(100);
    
    const records = await recordService.getRecords();
    const users = await userService.getUsers();
    const forms = await formService.getForms();
    
    const activities = records.slice(0, 10).map(record => {
      const user = users.find(u => u.id === record.userId);
      const form = forms.find(f => f.id === record.formId);
      
      return {
        id: record.id,
        type: "record" as const,
        description: `${user?.fullName || "Usuario"} completó "${form?.name || "Formulario"}"`,
        timestamp: record.createdAt,
      };
    });

    return activities;
  },
};
