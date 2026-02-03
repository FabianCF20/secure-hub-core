import { useEffect, useState } from "react";
import { Plus, Search, MoreHorizontal, Building2, Users, FileText } from "lucide-react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { clientService, userService, formService, recordService } from "@/services";
import { Client } from "@/models";
import { toast } from "sonner";

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "", isActive: true });
  const [clientStats, setClientStats] = useState<Record<string, { users: number; forms: number; records: number }>>({});

  useEffect(() => {
    loadClients();
  }, []);

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
          users: usersData.filter((u) => u.clientId === client.id).length,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Cargando clientes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-title">Gestión de Clientes</h1>
          <p className="page-description">
            Administra las empresas que utilizan la plataforma
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Clientes Registrados</CardTitle>
              <CardDescription>{clients.length} clientes en total</CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-medium">{client.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">{client.code}</code>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {clientStats[client.id]?.users || 0}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {clientStats[client.id]?.forms || 0}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {clientStats[client.id]?.records || 0}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={client.isActive ? "default" : "secondary"}
                      className={client.isActive ? "bg-success" : ""}
                    >
                      {client.isActive ? "Activo" : "Inactivo"}
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
                        <DropdownMenuItem onClick={() => openEditDialog(client)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(client)}>
                          {client.isActive ? "Desactivar" : "Activar"}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
            <DialogDescription>
              {editingClient
                ? "Modifica los datos del cliente"
                : "Ingresa los datos del nuevo cliente"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Empresa</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Seguridad Integral S.A."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Ej: SIN-001"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Cliente activo</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingClient ? "Guardar Cambios" : "Crear Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
