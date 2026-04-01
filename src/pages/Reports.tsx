import { useEffect, useState } from "react";
import { BarChart3, FileDown, Calendar, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { recordService, clientService, formService, userService } from "@/services";
import { Record as RecordType, Client, Form, User, RecordStatus } from "@/models";
import { LoadingState } from "@/components/shared";

const statusLabels: Record<RecordStatus, string> = {
  PENDING: "Pendiente",
  SENT: "Enviado",
  REVIEW_COORD: "Rev. Coordinador",
  REVIEW_ADMIN: "Rev. Admin",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState("records-by-client");
  const [records, setRecords] = useState<RecordType[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filterClient, setFilterClient] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("month");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const reportTypes = [
    { id: "records-by-client", name: "Registros por Cliente", description: "Cantidad de formularios diligenciados por cada cliente", icon: BarChart3 },
    { id: "records-by-form", name: "Registros por Formulario", description: "Distribución de registros por tipo de formulario", icon: BarChart3 },
    { id: "records-by-period", name: "Registros por Período", description: "Evolución temporal de registros diligenciados", icon: Calendar },
  ];

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [r, c, f, u] = await Promise.all([
        recordService.getRecords(),
        clientService.getClients(),
        formService.getForms(),
        userService.getUsers(),
      ]);
      setRecords(r); setClients(c); setForms(f); setUsers(u);
    } catch { toast.error("Error al cargar datos del reporte"); } finally { setLoading(false); }
  }

  function getFilteredRecords(): RecordType[] {
    let filtered = records;
    if (filterClient !== "all") filtered = filtered.filter((r) => r.clientId === filterClient);
    if (filterStatus !== "all") filtered = filtered.filter((r) => r.status === filterStatus);

    const now = new Date();
    const cutoff = new Date();
    if (filterPeriod === "week") cutoff.setDate(now.getDate() - 7);
    else if (filterPeriod === "month") cutoff.setMonth(now.getMonth() - 1);
    else if (filterPeriod === "quarter") cutoff.setMonth(now.getMonth() - 3);
    else if (filterPeriod === "year") cutoff.setFullYear(now.getFullYear() - 1);
    filtered = filtered.filter((r) => new Date(r.createdAt) >= cutoff);
    return filtered;
  }

  const getClientName = (id: string) => clients.find((c) => c.id === id)?.name || "—";
  const getFormName = (id: string) => forms.find((f) => f.id === id)?.name || "—";
  const getUserName = (id: string) => users.find((u) => u.id === id)?.fullName || "—";
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  function buildReportData() {
    const filtered = getFilteredRecords();
    if (selectedReport === "records-by-client") {
      const grouped: Record<string, number> = {};
      filtered.forEach((r) => { const name = getClientName(r.clientId); grouped[name] = (grouped[name] || 0) + 1; });
      return Object.entries(grouped).map(([name, count]) => ({ "Cliente": name, "Total Registros": count }));
    }
    if (selectedReport === "records-by-form") {
      const grouped: Record<string, number> = {};
      filtered.forEach((r) => { const name = getFormName(r.formId); grouped[name] = (grouped[name] || 0) + 1; });
      return Object.entries(grouped).map(([name, count]) => ({ "Formulario": name, "Total Registros": count }));
    }
    // records-by-period: full detail
    return filtered.map((r) => ({
      "Fecha": formatDate(r.createdAt),
      "Formulario": getFormName(r.formId),
      "Cliente": getClientName(r.clientId),
      "Usuario": getUserName(r.userId),
      "Estado": statusLabels[r.status],
      "Observaciones": r.observations || "",
      ...r.answers.reduce((acc, a) => {
        const field = forms.find((f) => f.id === r.formId)?.fields.find((fl) => fl.id === a.fieldId);
        acc[field?.label || a.fieldId] = a.value;
        return acc;
      }, {} as Record<string, string>),
    }));
  }

  function exportCSV() {
    const data = buildReportData();
    if (!data.length) { toast.error("No hay datos para exportar"); return; }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) => headers.map((h) => {
        const val = String((row as any)[h] ?? "").replace(/"/g, '""');
        return `"${val}"`;
      }).join(","))
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const reportName = reportTypes.find((r) => r.id === selectedReport)?.name || "reporte";
    a.href = url;
    a.download = `${reportName}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Reporte descargado exitosamente");
  }

  function exportDetailedCSV() {
    const filtered = getFilteredRecords();
    if (!filtered.length) { toast.error("No hay datos para exportar"); return; }

    // Get all unique field labels across all records
    const allFieldLabels = new Set<string>();
    filtered.forEach((r) => {
      const form = forms.find((f) => f.id === r.formId);
      r.answers.forEach((a) => {
        const field = form?.fields.find((fl) => fl.id === a.fieldId);
        allFieldLabels.add(field?.label || a.fieldId);
      });
    });

    const baseHeaders = ["ID", "Fecha", "Formulario", "Cliente", "Usuario", "Estado", "Observaciones"];
    const fieldHeaders = Array.from(allFieldLabels);
    const headers = [...baseHeaders, ...fieldHeaders];

    const rows = filtered.map((r) => {
      const form = forms.find((f) => f.id === r.formId);
      const answersMap: Record<string, string> = {};
      r.answers.forEach((a) => {
        const field = form?.fields.find((fl) => fl.id === a.fieldId);
        answersMap[field?.label || a.fieldId] = a.value;
      });

      return [
        r.id,
        formatDate(r.createdAt),
        getFormName(r.formId),
        getClientName(r.clientId),
        getUserName(r.userId),
        statusLabels[r.status],
        r.observations || "",
        ...fieldHeaders.map((h) => answersMap[h] || ""),
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Reporte_Completo_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Reporte completo descargado exitosamente");
  }

  if (loading) return <LoadingState message="Cargando datos del reporte..." />;

  const reportData = buildReportData();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Reportes</h1>
        <p className="page-description">Genera y exporta reportes del sistema</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Tipos de Reporte</CardTitle>
            <CardDescription>Selecciona el reporte a generar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {reportTypes.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`w-full p-4 rounded-lg text-left transition-colors ${
                  selectedReport === report.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-3">
                  <report.icon className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{report.name}</p>
                    <p className={`text-xs ${selectedReport === report.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {report.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{reportTypes.find((r) => r.id === selectedReport)?.name}</CardTitle>
                <CardDescription>{reportTypes.find((r) => r.id === selectedReport)?.description}</CardDescription>
              </div>
              <Badge variant="outline">{getFilteredRecords().length} registros</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={filterClient} onValueChange={setFilterClient}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los clientes</SelectItem>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Última semana</SelectItem>
                    <SelectItem value="month">Último mes</SelectItem>
                    <SelectItem value="quarter">Último trimestre</SelectItem>
                    <SelectItem value="year">Último año</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="PENDING">Pendiente</SelectItem>
                    <SelectItem value="SENT">Enviado</SelectItem>
                    <SelectItem value="APPROVED">Aprobado</SelectItem>
                    <SelectItem value="REJECTED">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {reportData.length > 0 ? (
              <div className="border rounded-lg overflow-auto max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(reportData[0]).map((key) => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.slice(0, 50).map((row, i) => (
                      <TableRow key={i}>
                        {Object.values(row).map((val, j) => (
                          <TableCell key={j} className="text-sm">{String(val)}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Sin datos</p>
                <p className="text-sm">No hay registros para los filtros seleccionados</p>
              </div>
            )}

            <div className="flex gap-3 justify-end flex-wrap">
              <Button variant="outline" onClick={exportCSV} disabled={!reportData.length}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar Resumen CSV
              </Button>
              <Button onClick={exportDetailedCSV} disabled={!getFilteredRecords().length}>
                <Download className="mr-2 h-4 w-4" />
                Exportar Detalle Completo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
