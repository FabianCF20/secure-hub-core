import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, User, Building2, Calendar, Check, X, MessageSquare, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { recordService, clientService, formService, userService } from "@/services";
import { Record as RecordType, Client, Form, User as UserType, RecordStatus } from "@/models";
import { toast } from "sonner";

const statusConfig: { [key in RecordStatus]: { label: string; className: string } } = {
  PENDING: { label: "Pendiente", className: "status-pending" },
  SENT: { label: "Enviado", className: "status-sent" },
  REVIEW_COORD: { label: "Rev. Coordinador", className: "status-sent" },
  REVIEW_ADMIN: { label: "Rev. Admin", className: "status-sent" },
  APPROVED: { label: "Aprobado", className: "status-approved" },
  REJECTED: { label: "Rechazado", className: "status-rejected" },
};

export default function RecordDetail() {
  const navigate = useNavigate();
  const { recordId } = useParams();
  const [record, setRecord] = useState<RecordType | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [observationDialogOpen, setObservationDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [observations, setObservations] = useState("");

  useEffect(() => {
    if (recordId) {
      loadData();
    }
  }, [recordId]);

  async function loadData() {
    try {
      const recordData = await recordService.getRecordById(recordId!);
      if (!recordData) {
        toast.error("Registro no encontrado");
        navigate("/records");
        return;
      }
      setRecord(recordData);
      setObservations(recordData.observations);

      const [clientData, formData, userData] = await Promise.all([
        clientService.getClientById(recordData.clientId),
        formService.getFormById(recordData.formId),
        userService.getUserById(recordData.userId),
      ]);

      setClient(clientData || null);
      setForm(formData || null);
      setUser(userData || null);
    } catch (error) {
      toast.error("Error al cargar registro");
    } finally {
      setLoading(false);
    }
  }

  function getFieldLabel(fieldId: string): string {
    const field = form?.fields.find((f) => f.id === fieldId);
    return field?.label || fieldId;
  }

  function getAnswerValue(fieldId: string): string {
    const answer = record?.answers.find((a) => a.fieldId === fieldId);
    return answer?.value || "—";
  }

  function openActionDialog(action: "APPROVED" | "REJECTED") {
    setPendingAction(action);
    setObservationDialogOpen(true);
  }

  async function confirmAction() {
    if (!pendingAction || !record) return;
    try {
      await recordService.updateRecordStatus(record.id, pendingAction, observations);
      toast.success(`Registro ${pendingAction === "APPROVED" ? "aprobado" : "rechazado"}`);
      setObservationDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error("Error al actualizar registro");
    }
  }

  function exportRecordCSV() {
    if (!record || !form) return;
    const rows: string[][] = [];
    rows.push(["Campo", "Valor"]);
    rows.push(["Formulario", form.name]);
    rows.push(["Cliente", client?.name || "—"]);
    rows.push(["Usuario", user?.fullName || "—"]);
    rows.push(["Fecha", formatDate(record.createdAt)]);
    rows.push(["Estado", statusConfig[record.status].label]);
    rows.push(["Observaciones", record.observations || ""]);
    rows.push(["", ""]);
    rows.push(["--- Respuestas ---", ""]);
    form.fields.forEach((field) => {
      rows.push([field.label, getAnswerValue(field.id)]);
    });
    if (record.evidence.qrValue) rows.push(["Código QR", record.evidence.qrValue]);

    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.name}_${record.id}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Registro descargado exitosamente");
  }

  function formatDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString("es-CO", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Cargando registro...</div>
      </div>
    );
  }

  if (!record || !form) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Registro no encontrado</div>
      </div>
    );
  }

  const statusConf = statusConfig[record.status];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/records")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="page-title">{form.name}</h1>
            <p className="page-description">Detalle del registro diligenciado</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportRecordCSV}>
            <Download className="mr-2 h-4 w-4" />
            Descargar
          </Button>
          {(record.status === "PENDING" || record.status === "SENT") && (
            <>
              <Button
                variant="outline"
                className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => openActionDialog("REJECTED")}
              >
                <X className="mr-2 h-4 w-4" />
                Rechazar
              </Button>
              <Button
                className="bg-success hover:bg-success/90"
                onClick={() => openActionDialog("APPROVED")}
              >
                <Check className="mr-2 h-4 w-4" />
                Aprobar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Respuestas del Formulario</CardTitle>
                <CardDescription>Datos ingresados por el operativo</CardDescription>
              </div>
              <Badge variant="outline" className={statusConf.className}>
                {statusConf.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {form.fields.map((field) => (
                <div key={field.id} className="flex flex-col gap-1 py-3 border-b last:border-0">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <p className="font-medium">{getAnswerValue(field.id)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Side Info */}
        <div className="space-y-6">
          {/* Meta Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Usuario</p>
                  <p className="font-medium">{user?.fullName || "—"}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium">{client?.name || "—"}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha</p>
                  <p className="font-medium text-sm">{formatDate(record.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evidence */}
          {(record.evidence.photos.length > 0 || record.evidence.signature || record.evidence.qrValue) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evidencias</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {record.evidence.photos.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Fotos</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {record.evidence.photos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Evidencia ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                      ))}
                    </div>
                  </div>
                )}
                {record.evidence.signature && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Firma</Label>
                    <div className="mt-2 p-4 border rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
                      [Firma digital capturada]
                    </div>
                  </div>
                )}
                {record.evidence.qrValue && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Código QR</Label>
                    <code className="block mt-2 p-2 bg-muted rounded text-sm">
                      {record.evidence.qrValue}
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Observations */}
          {record.observations && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Observaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{record.observations}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={observationDialogOpen} onOpenChange={setObservationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction === "APPROVED" ? "Aprobar Registro" : "Rechazar Registro"}
            </DialogTitle>
            <DialogDescription>
              {pendingAction === "APPROVED"
                ? "El registro será marcado como aprobado"
                : "El registro será rechazado y devuelto al operativo"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Ingrese observaciones adicionales..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObservationDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmAction}
              className={pendingAction === "APPROVED" ? "bg-success hover:bg-success/90" : ""}
              variant={pendingAction === "REJECTED" ? "destructive" : "default"}
            >
              {pendingAction === "APPROVED" ? "Aprobar" : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
