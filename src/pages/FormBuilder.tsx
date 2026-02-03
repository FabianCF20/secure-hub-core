import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Trash2,
  Settings2,
  Type,
  Hash,
  List,
  CheckSquare,
  Camera,
  PenTool,
  QrCode,
  Save,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formService, clientService } from "@/services";
import { Form, FormField, FieldType, Client } from "@/models";
import { toast } from "sonner";

const fieldTypeConfig: Record<FieldType, { icon: React.ElementType; label: string; color: string }> = {
  text: { icon: Type, label: "Texto", color: "bg-blue-100 text-blue-700" },
  number: { icon: Hash, label: "Número", color: "bg-green-100 text-green-700" },
  select: { icon: List, label: "Selección", color: "bg-purple-100 text-purple-700" },
  checkbox: { icon: CheckSquare, label: "Checkbox", color: "bg-orange-100 text-orange-700" },
  photo: { icon: Camera, label: "Foto", color: "bg-pink-100 text-pink-700" },
  signature: { icon: PenTool, label: "Firma", color: "bg-indigo-100 text-indigo-700" },
  qr: { icon: QrCode, label: "Código QR", color: "bg-teal-100 text-teal-700" },
};

export default function FormBuilder() {
  const navigate = useNavigate();
  const { formId } = useParams();
  const isEditing = !!formId;

  const [clients, setClients] = useState<Client[]>([]);
  const [formName, setFormName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [fieldSheetOpen, setFieldSheetOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Field form state
  const [fieldForm, setFieldForm] = useState({
    type: "text" as FieldType,
    label: "",
    required: false,
    helperText: "",
    options: "",
    minVal: "",
    maxVal: "",
    pattern: "",
  });

  useEffect(() => {
    loadData();
  }, [formId]);

  async function loadData() {
    try {
      const clientsData = await clientService.getClients();
      setClients(clientsData.filter(c => c.isActive));

      if (isEditing && formId) {
        const form = await formService.getFormById(formId);
        if (form) {
          setFormName(form.name);
          setSelectedClientId(form.clientId);
          setIsActive(form.isActive);
          setFields(form.fields);
        }
      } else if (clientsData.length > 0) {
        setSelectedClientId(clientsData[0].id);
      }
    } catch (error) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  function openAddField() {
    setEditingField(null);
    setFieldForm({
      type: "text",
      label: "",
      required: false,
      helperText: "",
      options: "",
      minVal: "",
      maxVal: "",
      pattern: "",
    });
    setFieldSheetOpen(true);
  }

  function openEditField(field: FormField) {
    setEditingField(field);
    setFieldForm({
      type: field.type,
      label: field.label,
      required: field.required,
      helperText: field.helperText || "",
      options: field.options?.join(", ") || "",
      minVal: field.validations?.min?.toString() || "",
      maxVal: field.validations?.max?.toString() || "",
      pattern: field.validations?.pattern || "",
    });
    setFieldSheetOpen(true);
  }

  function saveField() {
    const newField: FormField = {
      id: editingField?.id || `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: fieldForm.type,
      label: fieldForm.label,
      required: fieldForm.required,
      helperText: fieldForm.helperText || undefined,
      options: fieldForm.type === "select" && fieldForm.options
        ? fieldForm.options.split(",").map(o => o.trim()).filter(Boolean)
        : undefined,
      validations: fieldForm.type === "number" || fieldForm.type === "text"
        ? {
            min: fieldForm.minVal ? parseInt(fieldForm.minVal) : undefined,
            max: fieldForm.maxVal ? parseInt(fieldForm.maxVal) : undefined,
            pattern: fieldForm.pattern || undefined,
          }
        : undefined,
    };

    if (editingField) {
      setFields(fields.map(f => f.id === editingField.id ? newField : f));
    } else {
      setFields([...fields, newField]);
    }

    setFieldSheetOpen(false);
    toast.success(editingField ? "Campo actualizado" : "Campo agregado");
  }

  function deleteField(fieldId: string) {
    setFields(fields.filter(f => f.id !== fieldId));
    toast.success("Campo eliminado");
  }

  function moveField(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const newFields = [...fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setFields(newFields);
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error("Ingresa un nombre para el formulario");
      return;
    }
    if (!selectedClientId) {
      toast.error("Selecciona un cliente");
      return;
    }
    if (fields.length === 0) {
      toast.error("Agrega al menos un campo");
      return;
    }

    setSaving(true);
    try {
      if (isEditing && formId) {
        await formService.updateForm(formId, {
          name: formName,
          clientId: selectedClientId,
          isActive,
          fields,
        });
        toast.success("Formulario actualizado");
      } else {
        await formService.createForm({
          name: formName,
          clientId: selectedClientId,
          isActive,
          fields,
        });
        toast.success("Formulario creado");
      }
      navigate("/forms");
    } catch (error) {
      toast.error("Error al guardar formulario");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/forms")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="page-title">
              {isEditing ? "Editar Formulario" : "Nuevo Formulario"}
            </h1>
            <p className="page-description">
              {isEditing ? "Modifica la estructura del formulario" : "Diseña un nuevo formulario operativo"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewOpen(true)} disabled={fields.length === 0}>
            <Eye className="mr-2 h-4 w-4" />
            Vista Previa
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
            <CardDescription>Datos generales del formulario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="formName">Nombre del Formulario</Label>
              <Input
                id="formName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: Control de Acceso Vehicular"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientId">Cliente</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="isActive">Formulario activo</Label>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </CardContent>
        </Card>

        {/* Field Types */}
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Campo</CardTitle>
            <CardDescription>Arrastra o haz clic para agregar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(fieldTypeConfig).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <Button
                    key={type}
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-1"
                    onClick={() => {
                      setEditingField(null);
                      setFieldForm({
                        type: type as FieldType,
                        label: "",
                        required: false,
                        helperText: "",
                        options: "",
                        minVal: "",
                        maxVal: "",
                        pattern: "",
                      });
                      setFieldSheetOpen(true);
                    }}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{config.label}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
            <CardDescription>Estadísticas del formulario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Total de campos</span>
              <Badge variant="outline">{fields.length}</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Campos requeridos</span>
              <Badge variant="outline">{fields.filter(f => f.required).length}</Badge>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Campos opcionales</span>
              <Badge variant="outline">{fields.filter(f => !f.required).length}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fields List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Campos del Formulario</CardTitle>
            <CardDescription>
              {fields.length === 0
                ? "No hay campos. Agrega campos desde el panel lateral."
                : `${fields.length} campo(s) configurados`}
            </CardDescription>
          </div>
          <Button onClick={openAddField}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Campo
          </Button>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Comienza agregando campos a tu formulario</p>
            </div>
          ) : (
            <div className="space-y-2">
              {fields.map((field, index) => {
                const config = fieldTypeConfig[field.type];
                const Icon = config.icon;
                return (
                  <div
                    key={field.id}
                    className="flex items-center gap-3 p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveField(index, "up")}
                        disabled={index === 0}
                      >
                        <GripVertical className="h-4 w-4 rotate-90" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveField(index, "down")}
                        disabled={index === fields.length - 1}
                      >
                        <GripVertical className="h-4 w-4 rotate-90" />
                      </Button>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{field.label}</span>
                        {field.required && (
                          <Badge variant="destructive" className="text-xs">
                            Requerido
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {config.label}
                        {field.helperText && ` • ${field.helperText}`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditField(field)}
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteField(field.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Editor Sheet */}
      <Sheet open={fieldSheetOpen} onOpenChange={setFieldSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingField ? "Editar Campo" : "Nuevo Campo"}
            </SheetTitle>
            <SheetDescription>
              Configura las propiedades del campo
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label>Tipo de Campo</Label>
              <Select
                value={fieldForm.type}
                onValueChange={(value) => setFieldForm({ ...fieldForm, type: value as FieldType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(fieldTypeConfig).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Etiqueta</Label>
              <Input
                value={fieldForm.label}
                onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })}
                placeholder="Ej: Nombre del visitante"
              />
            </div>
            <div className="space-y-2">
              <Label>Texto de Ayuda (opcional)</Label>
              <Input
                value={fieldForm.helperText}
                onChange={(e) => setFieldForm({ ...fieldForm, helperText: e.target.value })}
                placeholder="Ej: Ingrese el nombre completo"
              />
            </div>
            {fieldForm.type === "select" && (
              <div className="space-y-2">
                <Label>Opciones (separadas por coma)</Label>
                <Textarea
                  value={fieldForm.options}
                  onChange={(e) => setFieldForm({ ...fieldForm, options: e.target.value })}
                  placeholder="Opción 1, Opción 2, Opción 3"
                />
              </div>
            )}
            {(fieldForm.type === "number" || fieldForm.type === "text") && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor Mínimo</Label>
                    <Input
                      type="number"
                      value={fieldForm.minVal}
                      onChange={(e) => setFieldForm({ ...fieldForm, minVal: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Máximo</Label>
                    <Input
                      type="number"
                      value={fieldForm.maxVal}
                      onChange={(e) => setFieldForm({ ...fieldForm, maxVal: e.target.value })}
                    />
                  </div>
                </div>
                {fieldForm.type === "text" && (
                  <div className="space-y-2">
                    <Label>Patrón (Regex)</Label>
                    <Input
                      value={fieldForm.pattern}
                      onChange={(e) => setFieldForm({ ...fieldForm, pattern: e.target.value })}
                      placeholder="Ej: ^[A-Z]{3}[0-9]{3}$"
                    />
                  </div>
                )}
              </>
            )}
            <div className="flex items-center justify-between pt-4">
              <Label>Campo requerido</Label>
              <Switch
                checked={fieldForm.required}
                onCheckedChange={(checked) => setFieldForm({ ...fieldForm, required: checked })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setFieldSheetOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={saveField} className="flex-1" disabled={!fieldForm.label.trim()}>
              {editingField ? "Actualizar" : "Agregar"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa: {formName || "Sin nombre"}</DialogTitle>
            <DialogDescription>
              Así se verá el formulario en la app móvil
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {fields.map((field) => {
              const config = fieldTypeConfig[field.type];
              return (
                <div key={field.id} className="space-y-2">
                  <Label className="flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  {field.type === "text" && <Input placeholder={field.helperText} disabled />}
                  {field.type === "number" && <Input type="number" placeholder={field.helperText} disabled />}
                  {field.type === "select" && (
                    <Select disabled>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                    </Select>
                  )}
                  {field.type === "checkbox" && (
                    <div className="flex items-center gap-2">
                      <input type="checkbox" disabled className="h-4 w-4" />
                      <span className="text-sm text-muted-foreground">{field.helperText || "Marcar si aplica"}</span>
                    </div>
                  )}
                  {field.type === "photo" && (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                      <Camera className="h-8 w-8 mx-auto mb-2" />
                      <span className="text-sm">Tomar foto</span>
                    </div>
                  )}
                  {field.type === "signature" && (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                      <PenTool className="h-8 w-8 mx-auto mb-2" />
                      <span className="text-sm">Firmar aquí</span>
                    </div>
                  )}
                  {field.type === "qr" && (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                      <QrCode className="h-8 w-8 mx-auto mb-2" />
                      <span className="text-sm">Escanear código QR</span>
                    </div>
                  )}
                  {field.helperText && field.type !== "checkbox" && (
                    <p className="text-xs text-muted-foreground">{field.helperText}</p>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button onClick={() => setPreviewOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
