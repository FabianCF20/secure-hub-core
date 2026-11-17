import { useEffect, useState } from "react";
import { AlertCircle, ClipboardList, PlusCircle, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { clientService } from "@/services";
import { firebaseIntelligenceService, type IntelligenceCaseSummary } from "@/services/firebase/firebaseIntelligenceService";
import type { Client, IntelligenceReportInput } from "@/models";
import { PageHeader, LoadingState } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type OwnReport = { id: string; caseId: string; caseNumber: string; observedAt: string; description: string; status: string; verificationStatus: string; };

export default function Intelligence() {
  const { user } = useAuth();
  const canReview = user?.role === "ADMIN" || user?.role === "CENTRAL" || user?.role === "ANALISTA";
  const isCentral = user?.role === "ADMIN" || user?.role === "CENTRAL";
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<IntelligenceCaseSummary[]>([]);
  const [reports, setReports] = useState<OwnReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [observedAt, setObservedAt] = useState(new Date().toISOString().slice(0, 16));
  const [description, setDescription] = useState("");
  const [physicalDescription, setPhysicalDescription] = useState("");
  const [clothing, setClothing] = useState("");
  const [behavior, setBehavior] = useState("");
  const [site, setSite] = useState("");
  const [post, setPost] = useState("");
  const [sourceType, setSourceType] = useState<"direct_observation" | "third_party_report">("direct_observation");

  async function loadData() {
    if (!user) return;
    setLoading(true);
    try {
      const clientData = isCentral ? await clientService.getClients() : await clientService.getClientsByIds(user.clientIds || []);
      setClients(clientData);
      if (canReview) setCases(await firebaseIntelligenceService.getCases());
      else setReports(await firebaseIntelligenceService.getMyReports(user.id) as OwnReport[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar Inteligencia.");
    } finally { setLoading(false); }
  }
  useEffect(() => { void loadData(); }, [user?.id]);

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientId || !description.trim()) { toast.error("Selecciona el cliente y describe los hechos observados."); return; }
    setSaving(true);
    try {
      const input: IntelligenceReportInput = {
        clientId, observedAt: new Date(observedAt).toISOString(), description: description.trim(),
        physicalDescription: physicalDescription.trim(), clothing: clothing.trim(),
        behavior: behavior.trim(), site: site.trim(), post: post.trim(), sourceType,
      };
      const result = await firebaseIntelligenceService.createReport(input);
      toast.success(`Expediente ${result.caseNumber} creado correctamente.`);
      setDescription(""); setPhysicalDescription(""); setClothing(""); setBehavior(""); setSite(""); setPost("");
      await loadData();
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo crear el expediente."); }
    finally { setSaving(false); }
  }
  const filteredCases = cases.filter(item => [item.caseNumber, item.createdByName, item.clientId, item.status].join(" ").toLowerCase().includes(search.toLowerCase()));

  if (loading) return <LoadingState message="Cargando módulo de inteligencia..." />;
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title={canReview ? "Inteligencia y seguimiento" : "Reportar observación"} description={canReview ? "Bandeja de expedientes para revisión y verificación autorizada." : "Registra hechos observados. SecureHub abrirá automáticamente un expediente para revisión central."} />
      {!isCentral && <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5" />Nuevo reporte de observación</CardTitle><CardDescription>Registra hechos concretos y su contexto. No incluyas conclusiones sobre culpabilidad ni datos sensibles innecesarios.</CardDescription></CardHeader>
        <CardContent><form onSubmit={submitReport} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Cliente *</Label><Select value={clientId} onValueChange={setClientId}><SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger><SelectContent>{clients.filter(c => c.isActive).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Fecha y hora del evento *</Label><Input type="datetime-local" value={observedAt} onChange={e => setObservedAt(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Sede / instalación</Label><Input value={site} onChange={e => setSite(e.target.value)} maxLength={200} /></div>
            <div className="space-y-2"><Label>Puesto</Label><Input value={post} onChange={e => setPost(e.target.value)} maxLength={200} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Origen de la información</Label><Select value={sourceType} onValueChange={(v: "direct_observation" | "third_party_report") => setSourceType(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="direct_observation">Observación directa</SelectItem><SelectItem value="third_party_report">Información de un tercero</SelectItem></SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label>Descripción objetiva de los hechos *</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} required maxLength={5000} placeholder="Describe qué ocurrió, dónde y en qué circunstancias. Separa lo observado de lo informado por terceros." /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Descripción física observable (si es pertinente)</Label><Textarea value={physicalDescription} onChange={e => setPhysicalDescription(e.target.value)} maxLength={2000} placeholder="Características visibles y aproximadas, sin inferir identidad." /></div>
            <div className="space-y-2"><Label>Vestimenta y accesorios</Label><Textarea value={clothing} onChange={e => setClothing(e.target.value)} maxLength={2000} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Conducta o modus operandi observado</Label><Textarea value={behavior} onChange={e => setBehavior(e.target.value)} maxLength={5000} placeholder="Acciones concretas, secuencia y elementos relacionados." /></div>
          </div>
          <div className="flex items-start gap-2 rounded-md border p-3 text-sm text-muted-foreground"><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />Este primer corte no adjunta archivos todavía. Las evidencias se incorporarán en la siguiente fase con controles de almacenamiento y acceso.</div>
          <Button type="submit" disabled={saving || clients.length === 0}>{saving ? "Guardando..." : "Registrar y abrir expediente"}</Button>
        </form></CardContent>
      </Card>}
      {canReview ? <Card>
        <CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Bandeja de expedientes</CardTitle><CardDescription>{cases.length} expedientes registrados</CardDescription></div><div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar código, reportante o cliente..." value={search} onChange={e => setSearch(e.target.value)} /></div><Button variant="outline" size="icon" onClick={loadData}><RefreshCw className="h-4 w-4" /></Button></div></div></CardHeader>
        <CardContent>{filteredCases.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No hay expedientes para mostrar.</p> : <div className="space-y-3">{filteredCases.map(item => <div key={item.id} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><ClipboardList className="h-5 w-5 text-primary" /><div><p className="font-semibold">{item.caseNumber}</p><p className="text-xs text-muted-foreground">Reportado por {item.createdByName} · Cliente {item.clientId}</p></div></div><Badge variant="outline">{item.status === "PENDING" ? "Pendiente de verificación" : item.status}</Badge></div>)}</div>}</CardContent>
      </Card> : <Card>
        <CardHeader><CardTitle>Mis reportes</CardTitle><CardDescription>Solo puedes consultar los reportes que tú has creado y su estado.</CardDescription></CardHeader>
        <CardContent>{reports.length === 0 ? <p className="py-6 text-sm text-muted-foreground">Aún no has registrado observaciones.</p> : <div className="space-y-3">{reports.map(report => <div key={report.id} className="rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">Expediente {report.caseNumber || report.id.slice(0, 8)}</span><Badge variant="outline">{report.verificationStatus === "REPORTED" ? "Pendiente de revisión" : report.verificationStatus}</Badge></div><p className="mt-2 text-sm">{report.description}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(report.observedAt).toLocaleString("es-CO")}</p></div>)}</div>}</CardContent>
      </Card>}
    </div>
  );
}
