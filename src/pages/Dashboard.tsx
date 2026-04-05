import { useEffect, useState } from "react";
import {
  Building2, Users, FileText, ClipboardList, Clock, AlertCircle,
  TrendingUp, ArrowRight, Activity,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dashboardService } from "@/services";
import { DashboardStats } from "@/models";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend,
} from "recharts";
import { Link } from "react-router-dom";
import { PageHeader, LoadingState } from "@/components/shared";
import { useAuth } from "@/contexts/AuthContext";

/* ── Stat Card ── */
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  description: string;
  variant: "primary" | "success" | "warning" | "info";
}

function StatCard({ title, value, icon: Icon, description, variant }: StatCardProps) {
  const styles = {
    primary: "stat-card-primary",
    success: "stat-card-success",
    warning: "stat-card-warning",
    info: "stat-card-info",
  };
  return (
    <Card className={`${styles[variant]} border-0 text-primary-foreground`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium opacity-90">{title}</CardTitle>
        <Icon className="h-5 w-5 opacity-80" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs opacity-80 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

/* ── Status Badge ── */
function StatusDot({ status }: { status?: string }) {
  const colors: Record<string, string> = { PENDING: "bg-warning", SENT: "bg-info", APPROVED: "bg-success", REJECTED: "bg-destructive" };
  const labels: Record<string, string> = { PENDING: "Pendiente", SENT: "Enviado", APPROVED: "Aprobado", REJECTED: "Rechazado" };
  return (
    <Badge variant="outline" className="shrink-0 gap-1.5 text-xs">
      <span className={`h-2 w-2 rounded-full ${colors[status || ""] || "bg-muted"}`} />
      {labels[status || ""] || "Registro"}
    </Badge>
  );
}

/* ── Activity Item ── */
interface ActivityItem { id: string; type: "record" | "form" | "user"; description: string; timestamp: string; status?: string; }

function ActivityRow({ activity, formatDate }: { activity: ActivityItem; formatDate: (d: string) => string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <ClipboardList className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{activity.description}</p>
          <p className="text-xs text-muted-foreground">{formatDate(activity.timestamp)}</p>
        </div>
      </div>
      <StatusDot status={activity.status} />
    </div>
  );
}

/* ── Custom Tooltip ── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Dashboard Page ── */
export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recordsByClient, setRecordsByClient] = useState<{ name: string; value: number }[]>([]);
  const [recordsByStatus, setRecordsByStatus] = useState<{ name: string; value: number; color: string }[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; registros: number; aprobados: number; rechazados: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        // Single consolidated call instead of 5 separate ones
        const data = await dashboardService.getAll(user);
        setStats(data.stats);
        setRecordsByClient(data.recordsByClient);
        setRecordsByStatus(data.recordsByStatus);
        setMonthlyTrend(data.monthlyTrend);
        setRecentActivity(data.recentActivity);
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [user]);

  const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  if (loading || !stats) return <LoadingState message="Cargando dashboard..." />;

  const COLORS = ["hsl(38, 92%, 50%)", "hsl(199, 89%, 48%)", "hsl(142, 71%, 45%)", "hsl(0, 72%, 51%)"];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Dashboard" description="Vista general del sistema de formularios operativos" />
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Clientes Activos" value={stats.totalClients} icon={Building2} description="Empresas registradas" variant="primary" />
        <StatCard title="Usuarios" value={stats.totalUsers} icon={Users} description="Usuarios activos" variant="info" />
        <StatCard title="Formularios" value={stats.totalForms} icon={FileText} description="Plantillas activas" variant="success" />
        <StatCard title="Total Registros" value={stats.totalRecords} icon={ClipboardList} description="Registros diligenciados" variant="primary" />
        <StatCard title="Registros Hoy" value={stats.recordsToday} icon={Clock} description="Diligenciados hoy" variant="info" />
        <StatCard title="Por Aprobar" value={stats.pendingApproval} icon={AlertCircle} description="Pendientes de revisión" variant="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-accent" />Tendencia Mensual</CardTitle>
          <CardDescription>Registros creados, aprobados y rechazados en los últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="gradRegistros" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gradAprobados" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gradRechazados" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="registros" name="Total Registros" stroke="hsl(199, 89%, 48%)" fill="url(#gradRegistros)" strokeWidth={2} />
                <Area type="monotone" dataKey="aprobados" name="Aprobados" stroke="hsl(142, 71%, 45%)" fill="url(#gradAprobados)" strokeWidth={2} />
                <Area type="monotone" dataKey="rechazados" name="Rechazados" stroke="hsl(0, 72%, 51%)" fill="url(#gradRechazados)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Registros por Cliente</CardTitle>
            <CardDescription>Distribución de registros diligenciados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {recordsByClient.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sin datos de registros por cliente</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recordsByClient} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Registros" fill="hsl(199, 89%, 48%)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />Estado de Registros</CardTitle>
            <CardDescription>Distribución por estado de aprobación</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={recordsByStatus} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value" label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""} labelLine={false}>
                    {recordsByStatus.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Actividad Reciente</CardTitle>
            <CardDescription>Últimos registros diligenciados</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/records">Ver todos<ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">No hay actividad reciente</div>
          ) : (
            <div className="space-y-0">
              {recentActivity.map((activity) => (<ActivityRow key={activity.id} activity={activity} formatDate={formatDate} />))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
