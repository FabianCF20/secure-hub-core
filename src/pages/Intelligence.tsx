import {
  BrainCircuit,
  FolderSearch,
  Network,
  FileCheck2,
  Lightbulb,
  ClipboardList,
  ShieldCheck,
  LockKeyhole,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const components = [
  {
    title: "Expedientes",
    description: "Apertura, clasificación, responsables, estado y trazabilidad de cada caso.",
    icon: FolderSearch,
    status: "Base definida",
  },
  {
    title: "Personas y organizaciones",
    description: "Registro de entidades relacionadas con un expediente, evitando duplicidades.",
    icon: Network,
    status: "Base definida",
  },
  {
    title: "Fuentes y evidencias",
    description: "Procedencia, metadatos, integridad y clasificación de documentos y soportes.",
    icon: FileCheck2,
    status: "Pendiente de integración",
  },
  {
    title: "Eventos y relaciones",
    description: "Línea de tiempo de hechos y vínculos documentados entre entidades.",
    icon: ClipboardList,
    status: "Pendiente de integración",
  },
  {
    title: "Coincidencias sugeridas",
    description: "El sistema propone posibles relaciones; un analista debe revisarlas y decidir.",
    icon: Lightbulb,
    status: "Revisión humana obligatoria",
  },
  {
    title: "Hallazgos e informes",
    description: "Conclusiones justificadas, vinculadas a fuentes y con historial de cambios.",
    icon: BrainCircuit,
    status: "Pendiente de integración",
  },
];

export default function Intelligence() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Centro de Inteligencia</h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Espacio de análisis para organizar expedientes, fuentes, entidades, eventos y hallazgos.
            La información se incorporará progresivamente desde los módulos existentes y mediante registro autorizado.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">Implementación por fases</Badge>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Controles de seguridad</CardTitle>
          </div>
          <CardDescription>
            El acceso a la información debe validarse en Firestore y en el servidor, no solamente en la interfaz.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2 text-sm">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>Acceso por rol, cliente asignado y propietario del expediente.</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>Escrituras críticas reservadas para funciones de servidor y auditadas.</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>Evidencias con acceso controlado y registro de procedencia.</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>Las coincidencias son sugerencias; nunca decisiones automáticas.</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {components.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardHeader className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">{item.status}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        No se muestran expedientes de demostración ni información ficticia. Los registros aparecerán cuando se habilite
        la recepción segura de datos y se creen expedientes reales autorizados.
      </p>
    </div>
  );
}
