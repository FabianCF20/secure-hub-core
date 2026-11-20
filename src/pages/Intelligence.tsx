import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  BrainCircuit,
  FolderSearch,
  Network,
  FileCheck2,
  Lightbulb,
  ClipboardList,
  ShieldCheck,
  LockKeyhole,
  RefreshCw,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { activeClientService } from "@/services/serviceAdapter";
import { intelligenceService } from "@/services/intelligenceService";
import type { Client } from "@/models";
import type { IntelligenceCase, IntelligenceClassification } from "@/models/intelligence";

interface OwnerOption {
  id: string;
  fullName: string;
  role: string;
}

const modules = [
  { title: "Expedientes", description: "Apertura, clasificación, responsables, estado y trazabilidad.", icon: FolderSearch, status: "En desarrollo" },
  { title: "Personas y organizaciones", description: "Entidades relacionadas con cada expediente.", icon: Network, status: "Siguiente fase" },
  { title: "Fuentes y evidencias", description: "Procedencia, integridad y clasificación de documentos.", icon: FileCheck2, status: "Siguiente fase" },
  { title: "Eventos y relaciones", description: "Hechos asociados y vínculos documentados.", icon: ClipboardList, status: "Siguiente fase" },
  { title: "Coincidencias sugeridas", description: "Posibles relaciones que requieren revisión humana.", icon: Lightbulb, status: "Siguiente fase" },
  { title: "Hallazgos e informes", description: "Conclusiones documentadas y auditables.", icon: BrainCircuit, status: "Siguiente fase" },
];

const classificationLabels: Record<IntelligenceClassification, string> = {
  PUBLIC_INTERNAL: "Interno",
  CONFIDENTIAL: "Confidencial",
  RESTRICTED: "Restringido",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : date.toLocaleString("es-CO");
}

export default function Intelligence() {
  const { user } = useAuth();
  const [cases, setCases] = useState<IntelligenceCase[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [classification, setClassification] = useState<IntelligenceClassification>("CONFIDENTIAL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canCreate = user?.role === "ADMIN" || user?.role === "CENTRAL" || user?.role === "COORDINADOR";

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await intelligenceService.listCases();
      setCases(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar los expedientes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  useEffect(() => {
    let active = true;
    async function loadClients() {
      if (!user || !canCreate) return;
      try {
        const result = user.role === "ADMIN" || user.role === "CENTRAL"
          ? await activeClientService.getClients()
          : await activeClientService.getClientsByIds(user.clientIds || []);
        if (active) setClients(result.filter((client) => client.isActive));
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "No fue posible cargar los clientes.");
      }
    }
    void loadClients();
    return () => { active = false; };
  }, [user, canCreate]);

  useEffect(() => {
    let active = true;
    async function loadOwners() {
      setOwners([]);
      setSelectedOwner("");
      if (!selectedClient) return;
      setLoadingOwners(true);
      try {
        const result = await intelligenceService.listAssignableOwners(selectedClient);
        if (active) setOwners(result);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "No fue posible cargar responsables.");
      } finally {
        if (active) setLoadingOwners(false);
      }
    }
    void loadOwners();
    return () => { active = false; };
  }, [selectedClient]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!selectedClient || !selectedOwner || !title.trim()) {
      setError("Completa el cliente, responsable y título del expediente.");
      return;
    }
    setSaving(true);
    try {
      await intelligenceService.createCase({
        title: title.trim(),
        summary: summary.trim(),
        clientId: selectedClient,
        ownerId: selectedOwner,
        classification,
        sourceType: "MANUAL",
      });
      setTitle("");
      setSummary("");
      setShowForm(false);
      setSuccess("Expediente creado y registrado en auditoría.");
      await loadCases();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear el expediente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Centro de Inteligencia</h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Recepción y análisis controlado de expedientes, fuentes, entidades, eventos y hallazgos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadCases()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
          {canCreate && (
            <Button onClick={() => { setShowForm((value) => !value); setError(""); }}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo expediente
            </Button>
          )}
        </div>
      </div>

      {error && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      {success && <div role="status" className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">{success}</div>}

      {showForm && canCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Recepción manual de expediente</CardTitle>
            <CardDescription>
              Los datos se validan en servidor. La creación queda registrada en auditoría y el expediente se asigna a un responsable del cliente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="intel-client" className="text-sm font-medium">Cliente</label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger id="intel-client"><SelectValue placeholder="Selecciona un cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="intel-owner" className="text-sm font-medium">Responsable</label>
                <Select value={selectedOwner} onValueChange={setSelectedOwner} disabled={!selectedClient || loadingOwners}>
                  <SelectTrigger id="intel-owner"><SelectValue placeholder={loadingOwners ? "Cargando responsables..." : "Selecciona responsable"} /></SelectTrigger>
                  <SelectContent>
                    {owners.map((owner) => <SelectItem key={owner.id} value={owner.id}>{owner.fullName} · {owner.role}</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedClient && !loadingOwners && owners.length === 0 && (
                  <p className="text-xs text-muted-foreground">No hay responsables activos asignados a este cliente.</p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="intel-title" className="text-sm font-medium">Título</label>
                <Input id="intel-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} required placeholder="Identificación breve del expediente" />
              </div>
              <div className="space-y-2">
                <label htmlFor="intel-classification" className="text-sm font-medium">Clasificación</label>
                <Select value={classification} onValueChange={(value) => setClassification(value as IntelligenceClassification)}>
                  <SelectTrigger id="intel-classification"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC_INTERNAL">Interno</SelectItem>
                    <SelectItem value="CONFIDENTIAL">Confidencial</SelectItem>
                    <SelectItem value="RESTRICTED">Restringido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Origen</label>
                <Input value="Registro manual" disabled />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="intel-summary" className="text-sm font-medium">Resumen inicial</label>
                <Textarea id="intel-summary" value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={4000} rows={4} placeholder="Describe el motivo de apertura sin incluir datos sensibles innecesarios." />
              </div>
              <div className="flex justify-end gap-2 md:col-span-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</Button>
                <Button type="submit" disabled={saving || loadingOwners || owners.length === 0}>{saving ? "Guardando..." : "Crear expediente"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Controles de seguridad</CardTitle>
          </div>
          <CardDescription>
            Las consultas de expedientes pasan por Cloud Functions para aplicar permisos en servidor y evitar guardar su contenido en la caché offline del navegador.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2 text-sm"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span>Acceso por rol, cliente asignado y propietario.</span></div>
          <div className="flex items-start gap-2 text-sm"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span>Creación y asignación validadas en servidor.</span></div>
          <div className="flex items-start gap-2 text-sm"><FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span>Evidencias aún no habilitadas; se requiere Storage privado.</span></div>
          <div className="flex items-start gap-2 text-sm"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span>Coincidencias siempre sujetas a revisión humana.</span></div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Expedientes</h2>
          <Badge variant="secondary">{cases.length} mostrados · máximo 50</Badge>
        </div>
        {loading ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Cargando expedientes autorizados...</CardContent></Card>
        ) : cases.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No hay expedientes disponibles para tu usuario.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {cases.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{item.title}</h3>
                      <Badge variant="outline">{classificationLabels[item.classification]}</Badge>
                      <Badge variant="secondary">{item.status}</Badge>
                    </div>
                    {item.summary && <p className="text-sm text-muted-foreground">{item.summary}</p>}
                    <p className="text-xs text-muted-foreground">Cliente: {item.clientId} · Responsable: {item.ownerId}</p>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground sm:text-right">
                    <p>Actualizado</p>
                    <p>{formatDate(item.updatedAt)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Componentes del módulo</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title}>
                <CardHeader className="space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
                  <div className="space-y-1"><CardTitle className="text-base">{item.title}</CardTitle><CardDescription>{item.description}</CardDescription></div>
                </CardHeader>
                <CardContent><Badge variant="secondary">{item.status}</Badge></CardContent>
              </Card>
            );
          })}
        </div>
      </section>
      <p className="text-xs text-muted-foreground">No se generan expedientes de demostración. La recepción desde módulos internos, los adjuntos y los componentes analíticos se habilitarán en sus fases correspondientes.</p>
    </div>
  );
}
