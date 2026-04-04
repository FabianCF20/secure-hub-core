import { DashboardStats, User, Client, Form, Record } from "@/models";
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

/**
 * Consolidated data loader — fetches clients, forms, records, and optionally users
 * in a SINGLE parallel call, then reuses the data for all dashboard computations.
 * This replaces 5 separate service calls that each queried the same collections.
 */
async function loadDashboardData(currentUser?: User | null) {
  const global = isGlobalRole(currentUser?.role);
  const clientIds = currentUser?.clientIds ?? [];
  const field = isFieldRole(currentUser?.role);

  const [clients, forms, records] = await Promise.all([
    global ? clientService.getClients() : clientService.getClientsByIds(clientIds),
    global ? formService.getForms() : formService.getFormsByClientIds(clientIds),
    global
      ? recordService.getRecords()
      : field && currentUser
        ? recordService.getRecordsByUser(currentUser.id)
        : recordService.getRecordsByClientIds(clientIds),
  ]);

  let users: User[] = [];
  if (currentUser?.role === "ADMIN") {
    users = await userService.getUsers();
  }

  return { clients, forms, records, users };
}

function computeStats(
  clients: Client[],
  forms: Form[],
  records: Record[],
  users: User[],
  isAdmin: boolean
): DashboardStats {
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
    totalUsers: isAdmin ? users.filter((u) => u.isActive).length : 0,
    totalForms: forms.filter((f) => f.isActive).length,
    totalRecords: records.length,
    recordsToday: recordsToday.length,
    pendingApproval: pendingRecords.length,
  };
}

function computeRecordsByClient(clients: Client[], records: Record[]) {
  return clients
    .map((client) => ({
      name: client.name.length > 20 ? client.name.substring(0, 20) + "..." : client.name,
      value: records.filter((r) => r.clientId === client.id).length,
    }))
    .filter((item) => item.value > 0);
}

function computeRecordsByStatus(records: Record[]) {
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
}

function computeMonthlyTrend(records: Record[]) {
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
}

function computeRecentActivity(records: Record[], forms: Form[]) {
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
}

export const dashboardService = {
  /**
   * Single consolidated call that returns ALL dashboard data.
   * Only 1 set of Firestore reads instead of 5 separate ones.
   */
  async getAll(currentUser?: User | null) {
    const { clients, forms, records, users } = await loadDashboardData(currentUser);

    return {
      stats: computeStats(clients, forms, records, users, currentUser?.role === "ADMIN"),
      recordsByClient: computeRecordsByClient(clients, records),
      recordsByStatus: computeRecordsByStatus(records),
      monthlyTrend: computeMonthlyTrend(records),
      recentActivity: computeRecentActivity(records, forms),
    };
  },

  // Keep individual methods for backward compat but they now use consolidated loader
  async getStats(currentUser?: User | null): Promise<DashboardStats> {
    return (await this.getAll(currentUser)).stats;
  },
  async getRecordsByClientChart(currentUser?: User | null) {
    return (await this.getAll(currentUser)).recordsByClient;
  },
  async getRecordsByStatusChart(currentUser?: User | null) {
    return (await this.getAll(currentUser)).recordsByStatus;
  },
  async getMonthlyTrend(currentUser?: User | null) {
    return (await this.getAll(currentUser)).monthlyTrend;
  },
  async getRecentActivity(currentUser?: User | null) {
    return (await this.getAll(currentUser)).recentActivity;
  },
};
