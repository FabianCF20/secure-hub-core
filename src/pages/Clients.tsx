import { useEffect, useState } from "react";
import { Plus, MoreHorizontal, Building2, Users, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { clientService, userService, formService, recordService } from "@/services";
import { Client } from "@/models";
import { toast } from "sonner";
import { PageHeader, SearchInput, LoadingState, StatusBadge, EntityAvatar, ResponsiveTable, ConfirmDialog } from "@/components/shared";

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "", isActive: true });
  const [clientStats, setClientStats] = useState<Record<string, { users: number; forms: number; records: number }>>({});

  useEffect(() => { loadClients(); }, []);

  useEffect(() => {
    const filtered = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredClients(filtered);
  }, [clients, searchQuery]);

  async function loadClients() {
    try {
      const [clientsData, usersData, formsData, recordsData] = await Promise.all([
        clientService.getClients(),
        userService.getUsers(),
        formService.getForms(),
        recordService.getRecords(),
      ]);
      const stats: Record<string, { users: number; forms: number; records: number }> = {};
      clientsData.forEach((client) => {
        stats[client.id] = {
          users: usersData.filter((u) => u.clientIds.includes(client.id)).length,
          forms: formsData.filter((f) => f.clientId === client.id).length,
          records: recordsData.filter((r) => r.clientId === client.id).length,
        };
      });
      setClients(clientsData);
      setClientStats(stats);
    } catch (error) {
      toast.error("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingClient(null);
    setFormData({ name: "", code: "", isActive: true });
    setDialogOpen(true);
  }

  function openEditDialog(client: Client) {
    setEditingClient(client);
    setFormData({ name: client.name, code: client.code, isActive: client.isActive });
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editingClient) {
        await clientService.updateClient(editingClient.id, formData);
        toast.success("Cliente actualizado");
      } else {
        await clientService.createClient(formData);
        toast.success("Cliente creado");
      }
      setDialogOpen(false);
      loadClients();
    } catch (error) {
      toast.error("Error al guardar cliente");
    }
  }

  async function toggleStatus(client: Client) {
    try {
      await clientService.toggleClientStatus(client.id);
      toast.success(client.isActive ? "Cliente desactivado" : "Cliente activado");
      loadClients();
    } catch (error) {
      toast.error("Error al cambiar estado");
    }
  }

  if (loading) return <LoadingState message="Cargando clientes..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestión de Clientes"
        description="Administra las empresas que utilizan la plataforma"
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nuevo Cliente</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle>Clientes Registrados</CardTitle>
              <CardDescription>{clients.length} clientes en total</CardDescription>
            </div>
            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Buscar por nombre o código..." className="lg:max-w-80" />
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            {filteredClients.map((client) => (
              <div key={client.id} className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <EntityAvatar icon={Building2} shape="rounded" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{client.name}</p>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded">{client.code}</code>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(client)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleStatus(client)}>{client.isActive ? "Desactivar" : "Activar"}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{clientStats[client.id]?.users || 0}</span>
                  <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{clientStats[client.id]?.forms || 0}</span>
                  <span>{clientStats[client.id]?.records || 0} registros</span>
                  <StatusBadge active={client.isActive} />
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
                    <TableHead>Cliente</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-center">Usuarios</TableHead>
                    <TableHead className="text-center">Formularios</TableHead>
                    <TableHead className="text-center">Registros</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id} className="table-row-hover">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <EntityAvatar icon={Building2} shape="rounded" />
                          <span className="font-medium">{client.name}</span>
                        </div>
                      </TableCell>
                      <TableCell><code className="text-sm bg-muted px-2 py-1 rounded">{client.code}</code></TableCell>
                      <TableCell className="text-center"><div className="flex items-center justify-center gap-1"><Users className="h-4 w-4 text-muted-foreground" />{clientStats[client.id]?.users || 0}</div></TableCell>
                      <TableCell className="text-center"><div className="flex items-center justify-center gap-1"><FileText className="h-4 w-4 text-muted-foreground" />{clientStats[client.id]?.forms || 0}</div></TableCell>
                      <TableCell className="text-center">{clientStats[client.id]?.records || 0}</TableCell>
                      <TableCell><StatusBadge active={client.isActive} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(client)}>Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStatus(client)}>{client.isActive ? "Desactivar" : "Activar"}</DropdownMenuItem>
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
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingClient ? "Editar Cliente" : "Nuevo Cliente"}
        description={editingClient ? "Modifica los datos del cliente" : "Ingresa los datos del nuevo cliente"}
        onConfirm={handleSave}
        confirmLabel={editingClient ? "Guardar Cambios" : "Crear Cliente"}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Nombre de la Empresa</Label>
          <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Seguridad Integral S.A." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Código</Label>
          <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="Ej: SIN-001" />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="isActive">Cliente activo</Label>
          <Switch id="isActive" checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
        </div>
      </ConfirmDialog>
    </div>
  );
}
