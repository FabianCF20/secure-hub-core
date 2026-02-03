import { useEffect, useState } from "react";
import { 
  Building2, 
  Users, 
  FileText, 
  ClipboardList, 
  Clock, 
  AlertCircle,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dashboardService, clientService, formService, userService } from "@/services";
import { DashboardStats, Client, Form, User as UserType } from "@/models";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Link } from "react-router-dom";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  description: string;
  variant: "primary" | "success" | "warning" | "info";
}

function StatCard({ title, value, icon: Icon, description, variant }: StatCardProps) {
  const variantStyles = {
    primary: "stat-card-primary",
    success: "stat-card-success",
    warning: "stat-card-warning",
    info: "stat-card-info",
  };

  return (
    <Card className={`${variantStyles[variant]} border-0 text-primary-foreground`}>
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

interface ActivityItem {
  id: string;
  type: "record" | "form" | "user";
  description: string;
  timestamp: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recordsByClient, setRecordsByClient] = useState<{ name: string; value: number }[]>([]);
  const [recordsByStatus, setRecordsByStatus] = useState<{ name: string; value: number; color: string }[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [statsData, byClient, byStatus, activity] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getRecordsByClientChart(),
          dashboardService.getRecordsByStatusChart(),
          dashboardService.getRecentActivity(),
        ]);
        
        setStats(statsData);
        setRecordsByClient(byClient);
        setRecordsByStatus(byStatus);
        setRecentActivity(activity);
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Cargando dashboard...</div>
      </div>
    );
  }

  const COLORS = ["hsl(199, 89%, 48%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)"];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">
          Vista general del sistema de formularios operativos
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Clientes Activos"
          value={stats.totalClients}
          icon={Building2}
          description="Empresas registradas"
          variant="primary"
        />
        <StatCard
          title="Usuarios"
          value={stats.totalUsers}
          icon={Users}
          description="Usuarios activos"
          variant="info"
        />
        <StatCard
          title="Formularios"
          value={stats.totalForms}
          icon={FileText}
          description="Plantillas activas"
          variant="success"
        />
        <StatCard
          title="Total Registros"
          value={stats.totalRecords}
          icon={ClipboardList}
          description="Registros diligenciados"
          variant="primary"
        />
        <StatCard
          title="Registros Hoy"
          value={stats.recordsToday}
          icon={Clock}
          description="Diligenciados hoy"
          variant="info"
        />
        <StatCard
          title="Por Aprobar"
          value={stats.pendingApproval}
          icon={AlertCircle}
          description="Pendientes de revisión"
          variant="warning"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Records by Client */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Registros por Cliente
            </CardTitle>
            <CardDescription>
              Distribución de registros diligenciados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recordsByClient} layout="vertical">
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={150}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Records by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Estado de Registros
            </CardTitle>
            <CardDescription>
              Distribución por estado de aprobación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={recordsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {recordsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Actividad Reciente</CardTitle>
            <CardDescription>Últimos registros diligenciados</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/records">
              Ver todos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <ClipboardList className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(activity.timestamp)}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">Registro</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
