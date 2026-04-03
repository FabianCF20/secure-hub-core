import { DashboardStats, User } from "@/models";
import {
  activeClientService as clientService,
  activeUserService as userService,
  activeFormService as formService,
  activeRecordService as recordService,
} from "@/services/serviceAdapter";

function isGlobalRole(role?: string) {
  return role === "ADMIN" || role === "CENTRAL";
}

function isFieldRole(role?: string) {
  return role === "SUPERVISOR" || role === "GUARDA";
}

export const dashboardService = {
  async getStats(currentUser?: User | null): Promise<DashboardStats> {
    const global = isGlobalRole(currentUser?.role);
    const clientIds = currentUser?.clientIds ?? [];

    const [clients, forms, records] = await Promise.all([
      global ? clientService.getClients() : clientService.getClientsByIds(clientIds),
      global ? formService.getForms() : formService.getFormsByClientIds(clientIds),
      global ? recordService.getRecords()
        : isFieldRole(currentUser?.role)
          ? recordService.getRecordsByUser(currentUser!.id)
          : recordService.getRecordsByClientIds(clientIds),
    ]);

    let totalUsers = 0;
    if (currentUser?.role === "ADMIN") {
      const users = await userService.getUsers();
      totalUsers = users.filter((u) => u.isActive).length;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recordsToday = records.filter((r) => {
      const d = new Date(r.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });

    const pendingRecords = records.filter(
      (r) => r.status === "PENDING" || r.status === "SENT"
    );

    return {
      totalClients: clients.filter((c) => c.isActive).length,
      totalUsers,
      totalForms: forms.filter((f) => f.isActive).length,
      totalRecords: records.length,
      recordsToday: recordsToday.length,
      pendingApproval: pendingRecords.length,
    };
  },

  async getRecordsByClientChart(
    currentUser?: User | null
  ): Promise<{ name: string; value: number }[]> {
    const global = isGlobalRole(currentUser?.role);
    const clientIds = currentUser?.clientIds ?? [];

    const [clients, records] = await Promise.all([
      global ? clientService.getClients() : clientService.getClientsByIds(clientIds),
      global
        ? recordService.getRecords()
        : isFieldRole(currentUser?.role)
          ? recordService.getRecordsByUser(currentUser!.id)
          : recordService.getRecordsByClientIds(clientIds),
    ]);

    return clients
      .map((client) => ({
        name:
          client.name.length > 20
            ? client.name.substring(0, 20) + "..."
            : client.name,
        value: records.filter((r) => r.clientId === client.id).length,
      }))
      .filter((item) => item.value > 0);
  },

  async getRecordsByStatusChart(
    currentUser?: User | null
  ): Promise<{ name: string; value: number; color: string }[]> {
    const global = isGlobalRole(currentUser?.role);
    const clientIds = currentUser?.clientIds ?? [];

    const records = global
      ? await recordService.getRecords()
      : isFieldRole(currentUser?.role)
        ? await recordService.getRecordsByUser(currentUser!.id)
        : await recordService.getRecordsByClientIds(clientIds);

    const statusMap = {
      PENDING: { name: "Pendiente", color: "hsl(var(--warning))" },
      SENT: { name: "Enviado", color: "hsl(var(--info))" },
      APPROVED: { name: "Aprobado", color: "hsl(var(--success))" },
      REJECTED: { name: "Rechazado", color: "hsl(var(--destructive))" },
    };

    return Object.entries(statusMap).map(([status, config]) => ({
      name: config.name,
      value: records.filter((r) => r.status === status).length,
      color: config.color,
    }));
  },

  async getMonthlyTrend(
    currentUser?: User | null
  ): Promise<{ month: string; registros: number; aprobados: number; rechazados: number }[]> {
    const global = isGlobalRole(currentUser?.role);
    const clientIds = currentUser?.clientIds ?? [];

    const records = global
      ? await recordService.getRecords()
      : isFieldRole(currentUser?.role)
        ? await recordService.getRecordsByUser(currentUser!.id)
        : await recordService.getRecordsByClientIds(clientIds);

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const now = new Date();
    const months: { month: string; registros: number; aprobados: number; rechazados: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const label = `${monthNames[month]} ${year}`;

      const monthRecords = records.filter((r) => {
        const d = new Date(r.createdAt);
        return d.getFullYear() === year && d.getMonth() === month;
      });

      months.push({
        month: label,
        registros: monthRecords.length,
        aprobados: monthRecords.filter((r) => r.status === "APPROVED").length,
        rechazados: monthRecords.filter((r) => r.status === "REJECTED").length,
      });
    }

    return months;
  },

  async getRecentActivity(
    currentUser?: User | null
  ): Promise<
    {
      id: string;
      type: "record" | "form" | "user";
      description: string;
      timestamp: string;
      status?: string;
    }[]
  > {
    const global = isGlobalRole(currentUser?.role);
    const clientIds = currentUser?.clientIds ?? [];

    const [records, forms] = await Promise.all([
      global
        ? recordService.getRecords()
        : currentUser?.role === "SUPERVISOR"
          ? recordService.getRecordsByUser(currentUser.id)
          : recordService.getRecordsByClientIds(clientIds),
      global ? formService.getForms() : formService.getFormsByClientIds(clientIds),
    ]);

    return records.slice(0, 10).map((record) => {
      const form = forms.find((f) => f.id === record.formId);
      return {
        id: record.id,
        type: "record" as const,
        description: `Registro de "${form?.name || "Formulario"}"`,
        timestamp: record.createdAt,
        status: record.status,
      };
    });
  },
};
