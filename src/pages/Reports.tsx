import { useState } from "react";
import { BarChart3, FileDown, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState("records-by-client");

  const reports = [
    {
      id: "records-by-client",
      name: "Registros por Cliente",
      description: "Cantidad de formularios diligenciados por cada cliente",
      icon: BarChart3,
    },
    {
      id: "records-by-form",
      name: "Registros por Formulario",
      description: "Distribución de registros por tipo de formulario",
      icon: BarChart3,
    },
    {
      id: "records-by-period",
      name: "Registros por Período",
      description: "Evolución temporal de registros diligenciados",
      icon: Calendar,
    },
  ];

  function handleExport(format: "pdf" | "excel") {
    toast.success(`Exportando reporte en formato ${format.toUpperCase()}...`);
    setTimeout(() => {
      toast.success("Reporte exportado exitosamente (simulado)");
    }, 1500);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Reportes</h1>
        <p className="page-description">
          Genera y exporta reportes del sistema
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Report Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Tipos de Reporte</CardTitle>
            <CardDescription>Selecciona el reporte a generar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {reports.map((report) => (
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
                    <p className={`text-xs ${
                      selectedReport === report.id
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    }`}>
                      {report.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Report Config & Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {reports.find((r) => r.id === selectedReport)?.name}
                </CardTitle>
                <CardDescription>
                  {reports.find((r) => r.id === selectedReport)?.description}
                </CardDescription>
              </div>
              <Badge variant="outline">Vista previa</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filters */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los clientes</SelectItem>
                    <SelectItem value="client_001">Seguridad Integral del Norte</SelectItem>
                    <SelectItem value="client_002">Protección Empresarial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <Select defaultValue="month">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
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
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="approved">Aprobados</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="rejected">Rechazados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview Placeholder */}
            <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Vista previa del reporte</p>
              <p className="text-sm">
                Los datos se mostrarán aquí cuando se conecte al backend
              </p>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => handleExport("excel")}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
              <Button onClick={() => handleExport("pdf")}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
