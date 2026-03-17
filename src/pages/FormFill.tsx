import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formService, recordService } from "@/services";
import { Form, FormField, FieldAnswer } from "@/models";
import { toast } from "sonner";
import { showActionError } from "@/lib/ui-feedback";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingState } from "@/components/shared";

export default function FormFill() {
  const navigate = useNavigate();
  const { formId } = useParams();
  const { user } = useAuth();

  const [form, setForm] = useState<Form | null>(null);
  const [answers, setAnswers] = useState<{ [fieldId: string]: string }>({});
  const [observations, setObservations] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadForm();
  }, [formId]);

  async function loadForm() {
    try {
      if (!formId) { navigate("/forms"); return; }
      const formData = await formService.getFormById(formId);
      if (!formData) {
        toast.error("El formulario no existe o no está disponible.");
        navigate("/forms");
        return;
      }
      if (!formData.isActive) {
        toast.error("Este formulario está desactivado.");
        navigate("/forms");
        return;
      }
      setForm(formData);
      // Inicializar respuestas vacías
      const initial: { [key: string]: string } = {};
      formData.fields.forEach((f) => {
        initial[f.id] = f.type === "checkbox" ? "false" : "";
      });
      setAnswers(initial);
    } catch (error) {
      showActionError("FormFill.loadForm", error, "No se pudo cargar el formulario.");
    } finally {
      setLoading(false);
    }
  }

  function updateAnswer(fieldId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function handleSubmit() {
    if (!form || !user) return;

    // Validar campos requeridos
    const missingFields = form.fields
      .filter((f) => f.required)
      .filter((f) => {
        const val = answers[f.id];
        if (f.type === "checkbox") return val !== "true";
        return !val || !val.trim();
      });

    if (missingFields.length > 0) {
      toast.error(`Completa los campos obligatorios: ${missingFields.map((f) => f.label).join(", ")}`);
      return;
    }

    setSubmitting(true);
    try {
      const fieldAnswers: FieldAnswer[] = form.fields.map((f) => ({
        fieldId: f.id,
        value: answers[f.id] || "",
      }));

      await recordService.createRecord({
        formId: form.id,
        clientId: form.clientId,
        userId: user.id,
        createdAt: new Date().toISOString(),
        status: "SENT",
        answers: fieldAnswers,
        evidence: { photos: [], signature: "", qrValue: "" },
        observations,
      });

      toast.success("Formulario enviado exitosamente");
      navigate("/records");
    } catch (error) {
      showActionError("FormFill.handleSubmit", error, "No se pudo enviar el formulario.");
    } finally {
      setSubmitting(false);
    }
  }

  function renderField(field: FormField) {
    const value = answers[field.id] || "";

    switch (field.type) {
      case "text":
        return (
          <Input
            value={value}
            onChange={(e) => updateAnswer(field.id, e.target.value)}
            placeholder={field.helperText || `Ingresa ${field.label.toLowerCase()}`}
          />
        );
      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => updateAnswer(field.id, e.target.value)}
            placeholder={field.helperText || "0"}
            min={field.validations?.min}
            max={field.validations?.max}
          />
        );
      case "select":
        return (
          <Select value={value} onValueChange={(v) => updateAnswer(field.id, v)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={value === "true"}
              onCheckedChange={(checked) => updateAnswer(field.id, checked ? "true" : "false")}
            />
            <span className="text-sm text-muted-foreground">{field.helperText || "Marcar si aplica"}</span>
          </div>
        );
      case "photo":
        return (
          <div className="text-sm text-muted-foreground border rounded-lg p-4 text-center">
            📷 Captura de foto (disponible en app móvil)
          </div>
        );
      case "signature":
        return (
          <div className="text-sm text-muted-foreground border rounded-lg p-4 text-center">
            ✍️ Firma digital (disponible en app móvil)
          </div>
        );
      case "qr":
        return (
          <Input
            value={value}
            onChange={(e) => updateAnswer(field.id, e.target.value)}
            placeholder="Código QR escaneado"
          />
        );
      default:
        return <Input value={value} onChange={(e) => updateAnswer(field.id, e.target.value)} />;
    }
  }

  if (loading) return <LoadingState message="Cargando formulario..." />;
  if (!form) return null;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/forms")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{form.name}</h1>
          <p className="text-sm text-muted-foreground">Versión {form.version} • {form.fields.length} campos</p>
        </div>
      </div>

      {/* Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Diligenciar Formulario
          </CardTitle>
          <CardDescription>Completa todos los campos requeridos y envía el registro</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {form.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label className="flex items-center gap-1">
                {field.label}
                {field.required && <span className="text-destructive">*</span>}
              </Label>
              {field.helperText && field.type !== "checkbox" && (
                <p className="text-xs text-muted-foreground">{field.helperText}</p>
              )}
              {renderField(field)}
            </div>
          ))}

          {/* Observaciones */}
          <div className="space-y-2 pt-4 border-t">
            <Label>Observaciones (opcional)</Label>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Notas adicionales sobre este registro..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/forms")}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          <Send className="mr-2 h-4 w-4" />
          {submitting ? "Enviando..." : "Enviar Registro"}
        </Button>
      </div>
    </div>
  );
}
