import { useEffect, useState } from "react";
import { Plus, MoreHorizontal, User as UserIcon, Trash2 } from "lucide-react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { userService, clientService } from "@/services";
import { User, Client, UserRole } from "@/models";
import { toast } from "sonner";
import { PageHeader, SearchInput, FilterBar, LoadingState, StatusBadge, EntityAvatar, ResponsiveTable, ConfirmDialog } from "@/components/shared";
import { showActionError } from "@/lib/ui-feedback";

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrador",
  CENTRAL: "Central",
  SUPERVISOR: "Supervisor",
  COORDINADOR: "Coordinador",
  CLIENTE: "Cliente",
  GUARDA: "Guarda de Seguridad",
};

const roleColors: Record<UserRole, string> = {
  ADMIN: "bg-destructive",
  CENTRAL: "bg-primary",
  SUPERVISOR: "bg-warning",
  COORDINADOR: "bg-info",
  CLIENTE: "bg-success",
  GUARDA: "bg-amber-600",
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "SUPERVISOR" as UserRole,
    clientIds: [] as string[],
    isActive: true,
  });

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    let filtered = users;
    if (searchQuery) {
      filtered = filtered.filter(
        (u) =>
          u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterClient !== "all") filtered = filtered.filter((u) => u.clientIds.includes(filterClient));
    if (filterRole !== "all") filtered = filtered.filter((u) => u.role === filterRole);
    if (filterStatus !== "all") filtered = filtered.filter((u) => filterStatus === "active" ? u.isActive : !u.isActive);
    setFilteredUsers(filtered);
  }, [users, searchQuery, filterClient, filterRole, filterStatus]);

  async function loadData() {
    try {
      const [usersData, clientsData] = await Promise.all([
        userService.getUsers(),
        clientService.getClients(),
      ]);
      setUsers(usersData);
      setClients(clientsData);
    } catch (error) {
      showActionError("Users.loadData", error, "No se pudieron cargar los usuarios y clientes.");
    } finally {
      setLoading(false);
    }
  }

  function getClientNames(clientIds: string[]): string {
    if (!clientIds || clientIds.length === 0) return "Sin asignar";
    return clientIds
      .map((id) => clients.find((c) => c.id === id)?.name || id)
      .join(", ");
  }

  function openCreateDialog() {
    setEditingUser(null);
    setFormData({ fullName: "", email: "", password: "", role: "SUPERVISOR", clientIds: [], isActive: true });
    setDialogOpen(true);
  }

  function openEditDialog(user: User) {
    setEditingUser(user);
    setFormData({ fullName: user.fullName, email: user.email, password: "", role: user.role, clientIds: [...user.clientIds], isActive: user.isActive });
    setDialogOpen(true);
  }

  function toggleClientSelection(clientId: string) {
    setFormData((prev) => {
      const exists = prev.clientIds.includes(clientId);
      return {
        ...prev,
        clientIds: exists
          ? prev.clientIds.filter((id) => id !== clientId)
          : [...prev.clientIds, clientId],
      };
    });
  }

  async function handleSave() {
    if (!formData.fullName.trim()) {
      toast.error("Debes ingresar el nombre completo del usuario.");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Debes ingresar el correo electrónico del usuario.");
      return;
    }
    if (!editingUser && (!formData.email || !formData.password)) {
      toast.error("Email y contraseña son obligatorios");
      return;
    }
    if (!editingUser && formData.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    try {
      if (editingUser) {
        const { password, ...updateData } = formData;
        await userService.updateUser(editingUser.id, updateData);
        toast.success("Usuario actualizado");
      } else {
        await userService.createUser(formData);
        toast.success("Usuario creado correctamente en Firebase Auth y Firestore");
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      showActionError("Users.handleSave", error, "No se pudo guardar el usuario.");
    }
  }

  async function toggleStatus(user: User) {
    try {
      await userService.toggleUserStatus(user.id);
      toast.success(user.isActive ? "Usuario desactivado" : "Usuario activado");
      loadData();
    } catch (error) {
      showActionError("Users.toggleStatus", error, "No se pudo cambiar el estado del usuario.");
    }
  }

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  function openDeleteConfirm(user: User) {
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
  }

  async function handleDeleteUser() {
    if (!userToDelete) return;
    try {
      await userService.deleteUser(userToDelete.id);
      toast.success(`Usuario "${userToDelete.fullName}" eliminado permanentemente`);
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      loadData();
    } catch (error) {
      showActionError("Users.handleDeleteUser", error, "No se pudo eliminar el usuario.");
    }
  }

  if (loading) return <LoadingState message="Cargando usuarios..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestión de Usuarios"
        description="Administra los usuarios de la plataforma"
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nuevo Usuario</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle>Usuarios Registrados</CardTitle>
                <CardDescription>{users.length} usuarios en total</CardDescription>
              </div>
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Buscar por nombre o email..."
                className="lg:max-w-80"
              />
            </div>
            <FilterBar>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="CENTRAL">Central</SelectItem>
                  <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                  <SelectItem value="COORDINADOR">Coordinador</SelectItem>
                  <SelectItem value="CLIENTE">Cliente</SelectItem>
                  <SelectItem value="GUARDA">Guarda de Seguridad</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
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
          <div className="space-y-3 md:hidden">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3 min-w-0">
                  <EntityAvatar icon={UserIcon} />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <Badge className={roleColors[user.role]}>{roleLabels[user.role]}</Badge>
                      <StatusBadge active={user.isActive} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {getClientNames(user.clientIds)}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                   <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(user)}>Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleStatus(user)}>{user.isActive ? "Desactivar" : "Activar"}</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => openDeleteConfirm(user)}>
                      <Trash2 className="mr-2 h-4 w-4" />Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>

          <ResponsiveTable>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Clientes</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="table-row-hover">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <EntityAvatar icon={UserIcon} />
                          <span className="font-medium">{user.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {user.clientIds.length === 0 ? (
                            <span className="text-muted-foreground text-sm">Sin asignar</span>
                          ) : (
                            user.clientIds.map((cId) => (
                              <Badge key={cId} variant="outline" className="text-xs">
                                {clients.find((c) => c.id === cId)?.name || cId}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={roleColors[user.role]}>{roleLabels[user.role]}</Badge>
                      </TableCell>
                      <TableCell><StatusBadge active={user.isActive} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(user)}>Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStatus(user)}>{user.isActive ? "Desactivar" : "Activar"}</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => openDeleteConfirm(user)}>
                              <Trash2 className="mr-2 h-4 w-4" />Eliminar
                            </DropdownMenuItem>
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
        title={editingUser ? "Editar Usuario" : "Nuevo Usuario"}
        description={editingUser ? "Modifica los datos del usuario" : "Ingresa los datos del nuevo usuario"}
        onConfirm={handleSave}
        confirmLabel={editingUser ? "Guardar Cambios" : "Crear Usuario"}
      >
        <div className="space-y-2">
          <Label htmlFor="fullName">Nombre Completo</Label>
          <Input id="fullName" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="Ej: Juan Pablo Rodríguez" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Ej: juan.rodriguez@empresa.com" />
        </div>
        {!editingUser && (
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
            <p className="text-xs text-muted-foreground">Se usará para crear la cuenta en Firebase Auth</p>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="role">Rol</Label>
          <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Administrador</SelectItem>
              <SelectItem value="CENTRAL">Central</SelectItem>
              <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
              <SelectItem value="COORDINADOR">Coordinador</SelectItem>
              <SelectItem value="CLIENTE">Cliente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {formData.role !== "ADMIN" && (
          <div className="space-y-2">
            <Label>Clientes Asignados</Label>
            <p className="text-xs text-muted-foreground">Selecciona uno o varios clientes (puede dejarse vacío)</p>
            <div className="max-h-40 overflow-y-auto space-y-2 rounded-md border p-3">
              {clients.map((client) => (
                <div key={client.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`client-${client.id}`}
                    checked={formData.clientIds.includes(client.id)}
                    onCheckedChange={() => toggleClientSelection(client.id)}
                  />
                  <Label htmlFor={`client-${client.id}`} className="text-sm font-normal cursor-pointer">
                    {client.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <Label htmlFor="isActive">Usuario activo</Label>
          <Switch id="isActive" checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Eliminar Usuario"
        description={`¿Estás seguro de que deseas eliminar permanentemente a "${userToDelete?.fullName}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteUser}
        confirmLabel="Eliminar Permanentemente"
        variant="destructive"
      />
    </div>
  );
}

