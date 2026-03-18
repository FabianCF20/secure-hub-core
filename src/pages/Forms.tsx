import { useEffect, useState } from "react";
import { Plus, MoreHorizontal, FileText, Copy, ArrowUpRight, Eye, ClipboardEdit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formService, clientService } from "@/services";
import { Form, Client } from "@/models";
import { toast } from "sonner";
import { PageHeader, SearchInput, FilterBar, LoadingState, StatusBadge, EntityAvatar, ResponsiveTable, ConfirmDialog } from "@/components/shared";
import { useRoleAccess } from "@/hooks/useRoleAccess";

export default function Forms() {
  const navigate = useNavigate();
  const { canCreateForms, isSupervisor, hasGlobalAccess, clientIds: userClientIds } = useRoleAccess();
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

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    let filtered = forms;
    if (searchQuery) filtered = filtered.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterClient !== "all") filtered = filtered.filter((f) => f.clientId === filterClient);
    if (filterStatus !== "all") filtered = filtered.filter((f) => filterStatus === "active" ? f.isActive : !f.isActive);
    setFilteredForms(filtered);
  }, [forms, searchQuery, filterClient, filterStatus]);

  async function loadData() {
    try {
      let formsData: Form[];
      let clientsData: Client[];

      if (hasGlobalAccess) {
        [formsData, clientsData] = await Promise.all([
          formService.getForms(),
          clientService.getClients(),
        ]);
      } else {
        
        [formsData, clientsData] = await Promise.all([
          formService.getFormsByClientIds(userClientIds),
          clientService.getClientsByIds(userClientIds),
        ]);
      }

      setForms(formsData);
      setClients(clientsData);
    } catch (error) { toast.error("Error al cargar formularios"); } finally { setLoading(false); }
  }

  const getClientName = (id: string) => clients.find((c) => c.id === id)?.name || "Sin asignar";

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
    } catch (error) { toast.error("Error al clonar formulario"); }
  }

  async function incrementVersion(form: Form) {
    try {
      await formService.incrementVersion(form.id);
      toast.success(`Versión incrementada a ${form.version + 1}`);
      loadData();
    } catch (error) { toast.error("Error al incrementar versión"); }
  }

  async function toggleStatus(form: Form) {
    try {
      await formService.toggleFormStatus(form.id);
      toast.success(form.isActive ? "Formulario desactivado" : "Formulario activado");
      loadData();
    } catch (error) { toast.error("Error al cambiar estado"); }
  }

  if (loading) return <LoadingState message="Cargando formularios..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestión de Formularios"
        description="Administra las plantillas de formularios operativos"
        actions={
          canCreateForms && (
            <Button onClick={() => navigate("/forms/builder")}>
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Nuevo Formulario</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          )
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle>Plantillas de Formularios</CardTitle>
                <CardDescription>{forms.length} formularios en total</CardDescription>
              </div>
              <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Buscar por nombre..." className="lg:max-w-80" />
            </div>
            <FilterBar>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </FilterBar>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            {filteredForms.map((form) => (
              <div key={form.id} className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <EntityAvatar icon={FileText} shape="rounded" />
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm">{form.name}</p>
                      <p className="text-xs text-muted-foreground">{getClientName(form.clientId)}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="shrink-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/forms/builder/${form.id}`)}><Eye className="mr-2 h-4 w-4" />Ver / Editar</DropdownMenuItem>
                      {isSupervisor && form.isActive && (
                        <DropdownMenuItem onClick={() => navigate(`/forms/fill/${form.id}`)}><ClipboardEdit className="mr-2 h-4 w-4" />Diligenciar</DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => openCloneDialog(form)}><Copy className="mr-2 h-4 w-4" />Clonar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => incrementVersion(form)}><ArrowUpRight className="mr-2 h-4 w-4" />Incrementar Versión</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => toggleStatus(form)}>{form.isActive ? "Desactivar" : "Activar"}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{form.fields.length} campos</Badge>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded">v{form.version}</code>
                  <StatusBadge active={form.isActive} />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <ResponsiveTable>
            <div className="hidden md:block">
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
                          <EntityAvatar icon={FileText} shape="rounded" />
                          <div>
                            <span className="font-medium">{form.name}</span>
                            <p className="text-xs text-muted-foreground">ID: {form.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getClientName(form.clientId)}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline">{form.fields.length} campos</Badge></TableCell>
                      <TableCell className="text-center"><code className="text-sm bg-muted px-2 py-1 rounded">v{form.version}</code></TableCell>
                      <TableCell><StatusBadge active={form.isActive} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/forms/builder/${form.id}`)}><Eye className="mr-2 h-4 w-4" />Ver / Editar</DropdownMenuItem>
                            {isSupervisor && form.isActive && (
                              <DropdownMenuItem onClick={() => navigate(`/forms/fill/${form.id}`)}><ClipboardEdit className="mr-2 h-4 w-4" />Diligenciar</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openCloneDialog(form)}><Copy className="mr-2 h-4 w-4" />Clonar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => incrementVersion(form)}><ArrowUpRight className="mr-2 h-4 w-4" />Incrementar Versión</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => toggleStatus(form)}>{form.isActive ? "Desactivar" : "Activar"}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ResponsiveTable>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
        title="Clonar Formulario"
        description={`Se creará una copia del formulario "${cloningForm?.name}"`}
        onConfirm={handleClone}
        confirmLabel="Clonar Formulario"
      >
        <div className="space-y-2">
          <Label htmlFor="cloneName">Nombre del nuevo formulario</Label>
          <Input id="cloneName" value={cloneName} onChange={(e) => setCloneName(e.target.value)} />
        </div>
      </ConfirmDialog>
    </div>
  );
}
