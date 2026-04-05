import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, User, Building2, Calendar, Check, X, MessageSquare, Download, MapPin, Clock, History } from "lucide-react";
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
import { firebaseAuditService } from "@/services/firebase/firebaseAuditService";
import { Record as RecordType, Client, Form, User as UserType, RecordStatus, AuditLog } from "@/models";
import { toast } from "sonner";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const statusConfig: { [key in RecordStatus]: { label: string; className: string } } = {
  PENDING: { label: "Pendiente", className: "status-pending" },
  SENT: { label: "Enviado", className: "status-sent" },
  REVIEW_COORD: { label: "Rev. Coordinador", className: "status-sent" },
  REVIEW_ADMIN: { label: "Rev. Admin", className: "status-sent" },
  APPROVED: { label: "Aprobado", className: "status-approved" },
  REJECTED: { label: "Rechazado", className: "status-rejected" },
};

const auditActionLabels: Record<string, string> = {
  created: "Registro creado",
  status_changed: "Estado actualizado",
  approved: "Aprobado",
  rejected: "Rechazado",
  edited: "Editado",
};

export default function RecordDetail() {
  const navigate = useNavigate();
  const { recordId } = useParams();
  const { isAdmin, isCentral, isCoordinador, canValidate, user: authUser } = useRoleAccess();
  const [record, setRecord] = useState<RecordType | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [user, setUser] = useState<UserType | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [observationDialogOpen, setObservationDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<RecordStatus | null>(null);
  const [observations, setObservations] = useState("");

  useEffect(() => {
    if (recordId) loadData();
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

      const [clientData, formData, userData, logs] = await Promise.all([
        clientService.getClientById(recordData.clientId),
        formService.getFormById(recordData.formId),
        userService.getUserById(recordData.userId),
        firebaseAuditService.getLogsByRecord(recordId!).catch(() => []),
      ]);

      setClient(clientData || null);
      setForm(formData || null);
      setUser(userData || null);
      setAuditLogs(logs);
    } catch (error) {
      toast.error("Error al cargar registro");
    } finally {
      setLoading(false);
    }
  }

  function getFieldLabel(fieldId: string): string {
    return form?.fields.find((f) => f.id === fieldId)?.label || fieldId;
  }

  function getAnswerValue(fieldId: string): string {
    return record?.answers.find((a) => a.fieldId === fieldId)?.value || "—";
  }

  /**
   * Determina las acciones disponibles según el rol y estado actual.
   * Flujo multinivel: SENT → REVIEW_COORD → REVIEW_ADMIN → APPROVED/REJECTED
   */
  function getAvailableActions(): { approve?: RecordStatus; reject: RecordStatus; approveLabel: string } | null {
    if (!record) return null;
    const status = record.status;

    // Coordinador: puede revisar registros SENT → pasa a REVIEW_COORD o rechaza
    if (isCoordinador && status === "SENT") {
      return { approve: "REVIEW_COORD", reject: "REJECTED", approveLabel: "Aprobar (Coord.)" };
    }

    // Admin/Central: puede revisar REVIEW_COORD → pasa a APPROVED o rechaza
    if ((isAdmin || isCentral) && status === "REVIEW_COORD") {
      return { approve: "APPROVED", reject: "REJECTED", approveLabel: "Aprobar Final" };
    }

    // Admin/Central: puede aprobar directamente si está en SENT (sin coordinador)
    if ((isAdmin || isCentral) && (status === "SENT" || status === "PENDING")) {
      return { approve: "APPROVED", reject: "REJECTED", approveLabel: "Aprobar" };
    }

    // Admin: puede aprobar REVIEW_ADMIN
    if (isAdmin && status === "REVIEW_ADMIN") {
      return { approve: "APPROVED", reject: "REJECTED", approveLabel: "Aprobar Final" };
    }

    return null;
  }

  function openActionDialog(targetStatus: RecordStatus) {
    setPendingAction(targetStatus);
    setObservationDialogOpen(true);
  }

  async function confirmAction() {
    if (!pendingAction || !record || !authUser) return;
    try {
      const previousStatus = record.status;
      await recordService.updateRecordStatus(record.id, pendingAction, observations);

      // Registrar en auditoría
      const auditAction = pendingAction === "REJECTED" ? "rejected" 
        : pendingAction === "APPROVED" ? "approved" 
        : "status_changed";

      await firebaseAuditService.addLog({
        recordId: record.id,
        action: auditAction,
        userId: authUser.id,
        userName: authUser.fullName,
        previousStatus,
        newStatus: pendingAction,
        observations,
        timestamp: new Date().toISOString(),
      });

      toast.success(`Registro ${statusConfig[pendingAction].label}`);
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
    if (record.location) {
      rows.push(["Latitud", String(record.location.latitude)]);
      rows.push(["Longitud", String(record.location.longitude)]);
      rows.push(["Precisión GPS", record.location.accuracy ? `${record.location.accuracy}m` : "—"]);
    }
    rows.push(["", ""]);
    rows.push(["--- Respuestas ---", ""]);
    form.fields.forEach((field) => {
      rows.push([field.label, getAnswerValue(field.id)]);
    });
    if (record.evidence.qrValue) rows.push(["Código QR", record.evidence.qrValue]);
    if (auditLogs.length) {
      rows.push(["", ""]);
      rows.push(["--- Historial de Auditoría ---", ""]);
      rows.push(["Fecha", "Acción", "Usuario", "Observaciones"]);
      auditLogs.forEach((log) => {
        rows.push([formatDate(log.timestamp), auditActionLabels[log.action] || log.action, log.userName, log.observations || ""]);
      });
    }

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
  const actions = getAvailableActions();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/records")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="page-title text-lg sm:text-2xl truncate">{form.name}</h1>
            <p className="page-description text-xs sm:text-sm">Detalle del registro</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap ml-11 sm:ml-0">
          <Button variant="outline" size="sm" onClick={exportRecordCSV}>
            <Download className="mr-1 h-4 w-4" />
            <span className="text-xs sm:text-sm">Descargar</span>
          </Button>
          {actions && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => openActionDialog(actions.reject)}
              >
                <X className="mr-1 h-4 w-4" />
                <span className="text-xs sm:text-sm">Rechazar</span>
              </Button>
              {actions.approve && (
                <Button
                  size="sm"
                  className="bg-success hover:bg-success/90"
                  onClick={() => openActionDialog(actions.approve!)}
                >
                  <Check className="mr-1 h-4 w-4" />
                  <span className="text-xs sm:text-sm">{actions.approveLabel}</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Workflow Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            {(["SENT", "REVIEW_COORD", "REVIEW_ADMIN", "APPROVED"] as RecordStatus[]).map((step, i) => {
              const stepOrder = { SENT: 1, REVIEW_COORD: 2, REVIEW_ADMIN: 3, APPROVED: 4 };
              const currentOrder = stepOrder[record.status as keyof typeof stepOrder] || 0;
              const thisOrder = stepOrder[step];
              const isActive = record.status === step;
              const isDone = currentOrder > thisOrder || record.status === "APPROVED";
              const isRejected = record.status === "REJECTED";

              return (
                <div key={step} className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isRejected ? "bg-destructive/20 text-destructive" :
                    isDone ? "bg-success/20 text-success" :
                    isActive ? "bg-primary text-primary-foreground" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {isDone ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs truncate ${isActive ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                    {statusConfig[step].label}
                  </span>
                  {i < 3 && <div className={`h-px flex-1 ${isDone ? "bg-success" : "bg-border"}`} />}
                </div>
              );
            })}
          </div>
          {record.status === "REJECTED" && (
            <p className="text-destructive text-sm mt-2 font-medium">⚠ Este registro fue rechazado</p>
          )}
        </CardContent>
      </Card>

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

          {/* GPS Location */}
          {record.location && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Ubicación GPS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Latitud</p>
                    <p className="font-mono">{record.location.latitude.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Longitud</p>
                    <p className="font-mono">{record.location.longitude.toFixed(6)}</p>
                  </div>
                </div>
                {record.location.accuracy && (
                  <p className="text-xs text-muted-foreground">Precisión: ±{record.location.accuracy.toFixed(0)}m</p>
                )}
                <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                  <a
                    href={`https://www.google.com/maps?q=${record.location.latitude},${record.location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin className="mr-2 h-3 w-3" />
                    Ver en Google Maps
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

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
                        <img key={index} src={photo} alt={`Evidencia ${index + 1}`} className="w-full h-24 object-cover rounded-lg border" />
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
                    <code className="block mt-2 p-2 bg-muted rounded text-sm">{record.evidence.qrValue}</code>
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

      {/* Audit Trail */}
      {auditLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Auditoría
            </CardTitle>
            <CardDescription>Registro cronológico de todas las acciones realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative pl-6 space-y-6">
              <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />
              {auditLogs.map((log) => (
                <div key={log.id} className="relative">
                  <div className="absolute -left-[17px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{auditActionLabels[log.action] || log.action}</span>
                      {log.previousStatus && log.newStatus && (
                        <span className="text-xs text-muted-foreground">
                          {statusConfig[log.previousStatus]?.label} → {statusConfig[log.newStatus]?.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{log.userName}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(log.timestamp)}</span>
                    </div>
                    {log.observations && (
                      <p className="text-sm text-muted-foreground mt-1 italic">"{log.observations}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Dialog */}
      <Dialog open={observationDialogOpen} onOpenChange={setObservationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction === "REJECTED" ? "Rechazar Registro" :
               pendingAction === "REVIEW_COORD" ? "Aprobar como Coordinador" :
               "Aprobar Registro"}
            </DialogTitle>
            <DialogDescription>
              {pendingAction === "REJECTED" ? "El registro será rechazado y devuelto al operativo" :
               pendingAction === "REVIEW_COORD" ? "El registro pasará a revisión del administrador" :
               "El registro será marcado como aprobado"}
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
            <Button variant="outline" onClick={() => setObservationDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={confirmAction}
              className={pendingAction !== "REJECTED" ? "bg-success hover:bg-success/90" : ""}
              variant={pendingAction === "REJECTED" ? "destructive" : "default"}
            >
              {pendingAction === "REJECTED" ? "Rechazar" :
               pendingAction === "REVIEW_COORD" ? "Aprobar (Coord.)" :
               "Aprobar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
