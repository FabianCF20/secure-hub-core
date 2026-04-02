import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { firebaseMinutaService } from "@/services/firebase/firebaseMinutaService";
import { activeClientService } from "@/services/serviceAdapter";
import { MinuteEntry, AnnotationType, Client, GeoLocation } from "@/models";
import { toast } from "sonner";
import {
  BookOpen,
  MapPin,
  Clock,
  Send,
  Lock,
  AlertTriangle,
  FileText,
  Eye,
  MessageSquare,
  ShieldCheck,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ANNOTATION_TYPES: { value: AnnotationType; label: string; icon: React.ElementType; color: string }[] = [
  { value: "novedad", label: "Novedad", icon: AlertTriangle, color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "observacion", label: "Observación", icon: Eye, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "incidente", label: "Incidente", icon: AlertTriangle, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  { value: "reporte", label: "Reporte", icon: FileText, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  { value: "consigna_general", label: "Consigna General", icon: ShieldCheck, color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
];

function getTypeConfig(type: AnnotationType) {
  return ANNOTATION_TYPES.find((t) => t.value === type) ?? ANNOTATION_TYPES[0];
}

export default function Minuta() {
  const { user, isAdmin, isCentral, isCoordinador, isSupervisor, hasGlobalAccess, clientIds } = useRoleAccess();

  const [entries, setEntries] = useState<MinuteEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedType, setSelectedType] = useState<AnnotationType | "">("");
  const [content, setContent] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [geoLocation, setGeoLocation] = useState<GeoLocation | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  // Filter
  const [filterType, setFilterType] = useState<AnnotationType | "all">("all");

  const canWrite = isSupervisor || isCentral || isCoordinador || isAdmin;
  const canWriteConsigna = isCentral || isCoordinador || isAdmin;
  const canClose = isCentral || isCoordinador || isAdmin;

  // Capture geolocation
  const captureGeo = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date().toISOString(),
        });
        setGeoStatus("success");
      },
      () => setGeoStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    captureGeo();
  }, [captureGeo]);

  // Load clients
  useEffect(() => {
    const load = async () => {
      try {
        if (hasGlobalAccess) {
          setClients(await activeClientService.getClients());
        } else if (clientIds.length > 0) {
          setClients(await activeClientService.getClientsByIds(clientIds));
        }
      } catch (e) {
        console.error("Error loading clients", e);
      }
    };
    load();
  }, [hasGlobalAccess, clientIds]);

  // Auto-select client for single-client users
  useEffect(() => {
    if (clients.length === 1 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  // Real-time listener
  useEffect(() => {
    if (!user) return;
    const ids = hasGlobalAccess ? "all" : clientIds;
    const unsub = firebaseMinutaService.subscribe(ids, (data) => {
      setEntries(data);
      setLoading(false);
    });
    return unsub;
  }, [user, hasGlobalAccess, clientIds]);

  const handleSubmit = async () => {
    if (!selectedType || !content.trim() || !selectedClientId || !user) {
      toast.error("Completa todos los campos");
      return;
    }
    if (selectedType === "consigna_general" && !canWriteConsigna) {
      toast.error("No tienes permisos para crear consignas generales");
      return;
    }

    setSubmitting(true);
    try {
      await firebaseMinutaService.create({
        clientId: selectedClientId,
        userId: user.id,
        userName: user.fullName,
        userRole: user.role,
        type: selectedType as AnnotationType,
        content: content.trim(),
        location: geoLocation ?? undefined,
        createdAt: new Date().toISOString(),
        isClosed: false,
      });
      setContent("");
      setSelectedType("");
      toast.success("Anotación registrada exitosamente");
    } catch (e: any) {
      toast.error("Error al guardar: " + (e.message || ""));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (entry: MinuteEntry) => {
    if (!user) return;
    try {
      await firebaseMinutaService.closeConsigna(entry.id, user.id, user.fullName);
      toast.success("Consigna cerrada");
    } catch (e: any) {
      toast.error("Error al cerrar: " + (e.message || ""));
    }
  };

  const clientName = (clientId: string) =>
    clients.find((c) => c.id === clientId)?.name ?? clientId;

  const filteredEntries =
    filterType === "all" ? entries : entries.filter((e) => e.type === filterType);

  const availableTypes = canWriteConsigna
    ? ANNOTATION_TYPES
    : ANNOTATION_TYPES.filter((t) => t.value !== "consigna_general");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minuta de Control"
        description="Registro inmutable de novedades, observaciones, incidentes y consignas"
      />

      {/* Formulario de nueva anotación */}
      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Nueva Anotación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Cliente</label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Tipo de anotación</label>
                <Select value={selectedType} onValueChange={(v) => setSelectedType(v as AnnotationType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2">
                          <t.icon className="h-4 w-4" />
                          {t.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Contenido</label>
              <Textarea
                placeholder="Escribe tu anotación aquí..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
              />
            </div>

            {/* GPS Status */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {geoStatus === "loading" && "Obteniendo ubicación..."}
              {geoStatus === "success" && `Ubicación capturada (${geoLocation?.latitude.toFixed(4)}, ${geoLocation?.longitude.toFixed(4)})`}
              {geoStatus === "error" && (
                <span className="text-destructive">
                  No se pudo obtener ubicación.{" "}
                  <button onClick={captureGeo} className="underline">Reintentar</button>
                </span>
              )}
              {geoStatus === "idle" && "Preparando GPS..."}
            </div>

            <Button onClick={handleSubmit} disabled={submitting || !selectedType || !content.trim() || !selectedClientId}>
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Guardando..." : "Registrar Anotación"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterType} onValueChange={(v) => setFilterType(v as AnnotationType | "all")}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las anotaciones</SelectItem>
            {ANNOTATION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredEntries.length} registro(s)
        </span>
      </div>

      {/* Timeline de anotaciones */}
      <div className="space-y-3">
        {loading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Cargando minuta...</CardContent></Card>
        ) : filteredEntries.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No hay anotaciones registradas</CardContent></Card>
        ) : (
          filteredEntries.map((entry) => {
            const typeConfig = getTypeConfig(entry.type);
            const TypeIcon = typeConfig.icon;
            return (
              <Card key={entry.id} className={entry.isClosed ? "opacity-70" : ""}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={typeConfig.color}>
                        <TypeIcon className="h-3 w-3 mr-1" />
                        {typeConfig.label}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">{entry.userName}</span>
                      <Badge variant="outline" className="text-xs">{entry.userRole}</Badge>
                      {hasGlobalAccess && (
                        <Badge variant="secondary" className="text-xs">{clientName(entry.clientId)}</Badge>
                      )}
                    </div>
                    {entry.type === "consigna_general" && !entry.isClosed && canClose && (
                      <Button size="sm" variant="outline" onClick={() => handleClose(entry)}>
                        <Lock className="h-3 w-3 mr-1" /> Cerrar
                      </Button>
                    )}
                    {entry.isClosed && (
                      <Badge variant="secondary" className="text-xs">
                        <Lock className="h-3 w-3 mr-1" />
                        Cerrada por {entry.closedByName}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-foreground whitespace-pre-wrap">{entry.content}</p>

                  <Separator />

                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(entry.createdAt), "dd MMM yyyy HH:mm:ss", { locale: es })}
                    </span>
                    {entry.location && (
                      <a
                        href={`https://www.google.com/maps?q=${entry.location.latitude},${entry.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <MapPin className="h-3 w-3" />
                        {entry.location.latitude.toFixed(4)}, {entry.location.longitude.toFixed(4)}
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
