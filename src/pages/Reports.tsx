import { useEffect, useState } from "react";
import { BarChart3, FileDown, Calendar, Download, FileText as FilePdf } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { recordService, clientService, formService, userService } from "@/services";
import { Record as RecordType, Client, Form, User, RecordStatus } from "@/models";
import { LoadingState } from "@/components/shared";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  function exportPDF() {
    const data = buildReportData();
    if (!data.length) { toast.error("No hay datos para exportar"); return; }

    const doc = new jsPDF({ orientation: "landscape" });
    const reportName = reportTypes.find((r) => r.id === selectedReport)?.name || "Reporte";
    const dateStr = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });

    // Header
    doc.setFontSize(18);
    doc.setTextColor(33, 37, 41);
    doc.text("SecureOps - Panel Administrativo", 14, 18);
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text(reportName, 14, 27);
    doc.setFontSize(10);
    doc.text(`Generado: ${dateStr}`, 14, 34);
    
    // Filters info
    const filterInfo: string[] = [];
    if (filterClient !== "all") filterInfo.push(`Cliente: ${getClientName(filterClient)}`);
    filterInfo.push(`Período: ${filterPeriod === "week" ? "Última semana" : filterPeriod === "month" ? "Último mes" : filterPeriod === "quarter" ? "Último trimestre" : "Último año"}`);
    if (filterStatus !== "all") filterInfo.push(`Estado: ${statusLabels[filterStatus as RecordStatus] || filterStatus}`);
    doc.text(filterInfo.join(" | "), 14, 40);

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 43, 283, 43);

    const headers = Object.keys(data[0]);
    const rows = data.map((row) => headers.map((h) => String((row as any)[h] ?? "")));

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 47,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
      doc.text("SecureOps © " + new Date().getFullYear(), 14, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`${reportName}_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("Reporte PDF descargado exitosamente");
  }

  function exportDetailedCSV() {
    const filtered = getFilteredRecords();
    if (!filtered.length) { toast.error("No hay datos para exportar"); return; }

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

  function exportMassivePDF() {
    const filtered = getFilteredRecords();
    const selected = selectedIds.size > 0
      ? filtered.filter((r) => selectedIds.has(r.id))
      : filtered;

    if (!selected.length) { toast.error("No hay registros seleccionados"); return; }

    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });

    selected.forEach((record, idx) => {
      if (idx > 0) doc.addPage();

      const form = forms.find((f) => f.id === record.formId);

      // Header
      doc.setFontSize(16);
      doc.setTextColor(33, 37, 41);
      doc.text("SecureOps - Registro Diligenciado", 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generado: ${dateStr}`, 14, 25);
      doc.line(14, 28, 196, 28);

      // Record info
      doc.setFontSize(12);
      doc.setTextColor(33, 37, 41);
      doc.text(`Formulario: ${form?.name || "—"}`, 14, 36);
      doc.setFontSize(10);
      doc.text(`Cliente: ${getClientName(record.clientId)}`, 14, 43);
      doc.text(`Usuario: ${getUserName(record.userId)}`, 14, 49);
      doc.text(`Fecha: ${formatDate(record.createdAt)}`, 14, 55);
      doc.text(`Estado: ${statusLabels[record.status]}`, 14, 61);
      if (record.observations) {
        doc.text(`Observaciones: ${record.observations}`, 14, 67);
      }

      // Answers table
      const answerRows = record.answers.map((a) => {
        const field = form?.fields.find((fl) => fl.id === a.fieldId);
        return [field?.label || a.fieldId, a.value || "—"];
      });

      autoTable(doc, {
        head: [["Campo", "Respuesta"]],
        body: answerRows,
        startY: record.observations ? 73 : 67,
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 14, right: 14 },
      });

      // Location
      if (record.location) {
        const finalY = (doc as any).lastAutoTable?.finalY || 120;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Ubicación: ${record.location.latitude.toFixed(6)}, ${record.location.longitude.toFixed(6)}`, 14, finalY + 8);
      }
    });

    // Page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
      doc.text("SecureOps © " + new Date().getFullYear(), 14, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`Registros_Masivo_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(`${selected.length} registro(s) exportados a PDF`);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const filtered = getFilteredRecords();
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  }

  if (loading) return <LoadingState message="Cargando datos del reporte..." />;

  const reportData = buildReportData();
  const filteredRecords = getFilteredRecords();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Reportes</h1>
        <p className="page-description">Genera y exporta reportes del sistema</p>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Tipos de Reporte</CardTitle>
            <CardDescription>Selecciona el reporte a generar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:space-y-2 lg:gap-0">
              {reportTypes.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={`flex-shrink-0 p-3 lg:p-4 rounded-lg text-left transition-colors ${
                    selectedReport === report.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2 lg:gap-3">
                    <report.icon className="h-4 w-4 lg:h-5 lg:w-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm whitespace-nowrap lg:whitespace-normal">{report.name}</p>
                      <p className={`text-xs hidden lg:block ${selectedReport === report.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {report.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{reportTypes.find((r) => r.id === selectedReport)?.name}</CardTitle>
                <CardDescription>{reportTypes.find((r) => r.id === selectedReport)?.description}</CardDescription>
              </div>
              <Badge variant="outline">{filteredRecords.length} registros</Badge>
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
                      {selectedReport === "records-by-period" && (
                        <TableHead className="w-10">
                          <Checkbox
                            checked={selectedIds.size === filteredRecords.length && filteredRecords.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                      )}
                      {Object.keys(reportData[0]).map((key) => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.slice(0, 50).map((row, i) => (
                      <TableRow key={i}>
                        {selectedReport === "records-by-period" && filteredRecords[i] && (
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(filteredRecords[i].id)}
                              onCheckedChange={() => toggleSelect(filteredRecords[i].id)}
                            />
                          </TableCell>
                        )}
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

            {selectedIds.size > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{selectedIds.size} registro(s) seleccionados</span>
                <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>Limpiar selección</Button>
              </div>
            )}

            <div className="flex gap-3 justify-end flex-wrap">
              <Button variant="outline" onClick={exportCSV} disabled={!reportData.length}>
                <FileDown className="mr-2 h-4 w-4" />
                CSV Resumen
              </Button>
              <Button variant="outline" onClick={exportPDF} disabled={!reportData.length}>
                <FilePdf className="mr-2 h-4 w-4" />
                PDF Resumen
              </Button>
              <Button variant="outline" onClick={exportDetailedCSV} disabled={!filteredRecords.length}>
                <Download className="mr-2 h-4 w-4" />
                CSV Detalle
              </Button>
              <Button onClick={exportMassivePDF} disabled={!filteredRecords.length}>
                <FilePdf className="mr-2 h-4 w-4" />
                {selectedIds.size > 0 ? `PDF Masivo (${selectedIds.size})` : "PDF Masivo (todos)"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
