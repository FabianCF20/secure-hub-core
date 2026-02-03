import { useEffect, useState } from "react";
import { Plus, Search, MoreHorizontal, FileText, Filter, Copy, ArrowUpRight, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Label } from "@/components/ui/label";
import { formService, clientService } from "@/services";
import { Form, Client } from "@/models";
import { toast } from "sonner";

export default function Forms() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<Form[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredForms, setFilteredForms] = useState<Form[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloningForm, setCloningForm] = useState<Form | null>(null);
  const [cloneName, setCloneName] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = forms;

    if (searchQuery) {
      filtered = filtered.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterClient !== "all") {
      filtered = filtered.filter((f) => f.clientId === filterClient);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((f) =>
        filterStatus === "active" ? f.isActive : !f.isActive
      );
    }

    setFilteredForms(filtered);
  }, [forms, searchQuery, filterClient, filterStatus]);

  async function loadData() {
    try {
      const [formsData, clientsData] = await Promise.all([
        formService.getForms(),
        clientService.getClients(),
      ]);
      setForms(formsData);
      setClients(clientsData);
    } catch (error) {
      toast.error("Error al cargar formularios");
    } finally {
      setLoading(false);
    }
  }

  function getClientName(clientId: string): string {
    const client = clients.find((c) => c.id === clientId);
    return client?.name || "Sin asignar";
  }

  function openCloneDialog(form: Form) {
    setCloningForm(form);
    setCloneName(`${form.name} (Copia)`);
    setCloneDialogOpen(true);
  }

  async function handleClone() {
    if (!cloningForm) return;
    try {
      await formService.cloneForm(cloningForm.id, cloneName);
      toast.success("Formulario clonado exitosamente");
      setCloneDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error("Error al clonar formulario");
    }
  }

  async function incrementVersion(form: Form) {
    try {
      await formService.incrementVersion(form.id);
      toast.success(`Versión incrementada a ${form.version + 1}`);
      loadData();
    } catch (error) {
      toast.error("Error al incrementar versión");
    }
  }

  async function toggleStatus(form: Form) {
    try {
      await formService.toggleFormStatus(form.id);
      toast.success(form.isActive ? "Formulario desactivado" : "Formulario activado");
      loadData();
    } catch (error) {
      toast.error("Error al cambiar estado");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Cargando formularios...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-title">Gestión de Formularios</h1>
          <p className="page-description">
            Administra las plantillas de formularios operativos
          </p>
        </div>
        <Button onClick={() => navigate("/forms/builder")}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Formulario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Plantillas de Formularios</CardTitle>
                <CardDescription>{forms.length} formularios en total</CardDescription>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filtros:</span>
              </div>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Formulario</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-center">Campos</TableHead>
                <TableHead className="text-center">Versión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredForms.map((form) => (
                <TableRow key={form.id} className="table-row-hover">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <span className="font-medium">{form.name}</span>
                        <p className="text-xs text-muted-foreground">
                          ID: {form.id}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getClientName(form.clientId)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{form.fields.length} campos</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      v{form.version}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={form.isActive ? "default" : "secondary"}
                      className={form.isActive ? "bg-success" : ""}
                    >
                      {form.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/forms/builder/${form.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver / Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openCloneDialog(form)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Clonar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => incrementVersion(form)}>
                          <ArrowUpRight className="mr-2 h-4 w-4" />
                          Incrementar Versión
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toggleStatus(form)}>
                          {form.isActive ? "Desactivar" : "Activar"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Clone Dialog */}
      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clonar Formulario</DialogTitle>
            <DialogDescription>
              Se creará una copia del formulario "{cloningForm?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cloneName">Nombre del nuevo formulario</Label>
              <Input
                id="cloneName"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleClone}>Clonar Formulario</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
