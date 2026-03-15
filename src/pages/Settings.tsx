import { useState, useEffect } from "react";
import { Save, Building2, Palette, Upload, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SystemConfig } from "@/models";
import { toast } from "sonner";
import { firebaseConfigService } from "@/services/firebase/firebaseConfigService";
import { useRoleAccess } from "@/hooks/useRoleAccess";

export default function Settings() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [retention, setRetention] = useState("365");
  const [sessionDuration, setSessionDuration] = useState("480");
  const [language, setLanguage] = useState("es");
  const { isAdmin } = useRoleAccess();

  useEffect(() => {
    firebaseConfigService.getConfig()
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error cargando configuración:", err);
        toast.error("Error al cargar la configuración");
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      await firebaseConfigService.saveConfig(config);
      toast.success("Configuración guardada exitosamente");
    } catch (err: any) {
      console.error("Error guardando configuración:", err);
      toast.error("Error al guardar: " + (err.message || "Permisos insuficientes"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Cargando configuración...</span>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-description">
            Administra la configuración general del sistema
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        )}
      </div>

      {!isAdmin && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-800 text-sm">
          Solo los administradores pueden modificar la configuración del sistema. Estás en modo lectura.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Datos de la Empresa
            </CardTitle>
            <CardDescription>Información general que se mostrará en el sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nombre de la Empresa</Label>
              <Input
                id="companyName"
                value={config.companyName}
                onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Zona Horaria</Label>
              <Select
                value={config.timezone}
                onValueChange={(value) => setConfig({ ...config, timezone: value })}
                disabled={!isAdmin}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Bogota">América/Bogotá (GMT-5)</SelectItem>
                  <SelectItem value="America/Mexico_City">América/Ciudad de México (GMT-6)</SelectItem>
                  <SelectItem value="America/Lima">América/Lima (GMT-5)</SelectItem>
                  <SelectItem value="America/Santiago">América/Santiago (GMT-4)</SelectItem>
                  <SelectItem value="America/Buenos_Aires">América/Buenos Aires (GMT-3)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Logo de la Empresa</Label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground">
                  {config.companyLogo ? (
                    <img src={config.companyLogo} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <Upload className="h-8 w-8" />
                  )}
                </div>
                <Button variant="outline" size="sm" disabled={!isAdmin}>Subir Logo</Button>
              </div>
              <p className="text-xs text-muted-foreground">Formatos permitidos: PNG, JPG. Tamaño máximo: 2MB</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Personalización Visual
            </CardTitle>
            <CardDescription>Colores corporativos del sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Color Primario</Label>
              <div className="flex gap-3">
                <Input
                  id="primaryColor"
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                  disabled={!isAdmin}
                />
                <Input
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  className="flex-1"
                  disabled={!isAdmin}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Color Secundario</Label>
              <div className="flex gap-3">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={config.secondaryColor}
                  onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                  disabled={!isAdmin}
                />
                <Input
                  value={config.secondaryColor}
                  onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                  className="flex-1"
                  disabled={!isAdmin}
                />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Vista Previa</Label>
              <div className="p-4 rounded-lg border space-y-3">
                <div className="flex gap-2">
                  <div className="h-12 w-12 rounded" style={{ backgroundColor: config.primaryColor }} />
                  <div className="h-12 w-12 rounded" style={{ backgroundColor: config.secondaryColor }} />
                </div>
                <p className="text-xs text-muted-foreground">Los colores se aplicarán en toda la interfaz del sistema</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Parámetros del Sistema</CardTitle>
            <CardDescription>Configuración adicional del comportamiento del sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Retención de Registros</Label>
                <Select value={retention} onValueChange={setRetention} disabled={!isAdmin}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="90">90 días</SelectItem>
                    <SelectItem value="180">180 días</SelectItem>
                    <SelectItem value="365">1 año</SelectItem>
                    <SelectItem value="730">2 años</SelectItem>
                    <SelectItem value="unlimited">Sin límite</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Tiempo que se conservan los registros</p>
              </div>
              <div className="space-y-2">
                <Label>Sesión de Usuario</Label>
                <Select value={sessionDuration} onValueChange={setSessionDuration} disabled={!isAdmin}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="240">4 horas</SelectItem>
                    <SelectItem value="480">8 horas</SelectItem>
                    <SelectItem value="1440">24 horas</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Duración máxima de la sesión</p>
              </div>
              <div className="space-y-2">
                <Label>Idioma del Sistema</Label>
                <Select value={language} onValueChange={setLanguage} disabled={!isAdmin}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Idioma de la interfaz</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
