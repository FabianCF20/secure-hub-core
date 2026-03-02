import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Check, X, ClipboardList } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { recordService, clientService, formService, userService } from "@/services";
import { Record as RecordType, Client, Form, User, RecordStatus } from "@/models";
import { toast } from "sonner";
import { PageHeader, SearchInput, FilterBar, LoadingState, EntityAvatar, ResponsiveTable } from "@/components/shared";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const statusConfig: { [key in RecordStatus]: { label: string; className: string } } = {
  PENDING: { label: "Pendiente", className: "status-pending" },
  SENT: { label: "Enviado", className: "status-sent" },
  APPROVED: { label: "Aprobado", className: "status-approved" },
  REJECTED: { label: "Rechazado", className: "status-rejected" },
};

export default function Records() {
  const navigate = useNavigate();
  const { canValidate, filterByClientAccess, hasGlobalAccess } = useRoleAccess();
  const [records, setRecords] = useState<RecordType[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<RecordType[]>([]);
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterForm, setFilterForm] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    let filtered = records;
    if (filterClient !== "all") filtered = filtered.filter((r) => r.clientId === filterClient);
    if (filterForm !== "all") filtered = filtered.filter((r) => r.formId === filterForm);
    if (filterStatus !== "all") filtered = filtered.filter((r) => r.status === filterStatus);
    if (searchQuery) {
      filtered = filtered.filter((r) => {
        const user = users.find((u) => u.id === r.userId);
        return user?.fullName.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }
    setFilteredRecords(filtered);
  }, [records, filterClient, filterForm, filterStatus, searchQuery, users]);

  async function loadData() {
    try {
      const [recordsData, clientsData, formsData, usersData] = await Promise.all([
        recordService.getRecords(), clientService.getClients(), formService.getForms(), userService.getUsers(),
      ]);
      // Filtrar registros según el rol del usuario
      const accessibleRecords = filterByClientAccess(recordsData);
      setRecords(accessibleRecords);
      const accessibleClients = hasGlobalAccess
        ? clientsData
        : clientsData.filter((c) => accessibleRecords.some((r) => r.clientId === c.id));
      setClients(accessibleClients);
      setForms(formsData);
      setUsers(usersData);
    } catch (error) { toast.error("Error al cargar registros"); } finally { setLoading(false); }
  }

  const getClientName = (id: string) => clients.find((c) => c.id === id)?.name || "—";
  const getFormName = (id: string) => forms.find((f) => f.id === id)?.name || "—";
  const getUserName = (id: string) => users.find((u) => u.id === id)?.fullName || "—";
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  async function updateStatus(recordId: string, status: RecordStatus) {
    try {
      await recordService.updateRecordStatus(recordId, status);
      toast.success(`Registro ${status === "APPROVED" ? "aprobado" : "rechazado"}`);
      loadData();
    } catch (error) { toast.error("Error al actualizar estado"); }
  }

  if (loading) return <LoadingState message="Cargando registros..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Registros Diligenciados" description="Gestiona y aprueba los formularios completados" />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle>Historial de Registros</CardTitle>
                <CardDescription>{records.length} registros en total</CardDescription>
              </div>
              <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Buscar por usuario..." className="lg:max-w-80" />
            </div>
            <FilterBar>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterForm} onValueChange={setFilterForm}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Formulario" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los formularios</SelectItem>
                  {forms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="PENDING">Pendiente</SelectItem>
                  <SelectItem value="SENT">Enviado</SelectItem>
                  <SelectItem value="APPROVED">Aprobado</SelectItem>
                  <SelectItem value="REJECTED">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </FilterBar>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            {filteredRecords.map((record) => {
              const config = statusConfig[record.status];
              return (
                <div key={record.id} className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <EntityAvatar icon={ClipboardList} shape="rounded" />
                      <div className="min-w-0">
                        <p className="font-medium truncate text-sm">{getFormName(record.formId)}</p>
                        <p className="text-xs text-muted-foreground">{getUserName(record.userId)}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={config.className}>{config.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(record.createdAt)}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/records/${record.id}`)}><Eye className="h-3.5 w-3.5" /></Button>
                      {canValidate && (record.status === "PENDING" || record.status === "SENT") && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => updateStatus(record.id, "APPROVED")}><Check className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateStatus(record.id, "REJECTED")}><X className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <ResponsiveTable>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Formulario</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => {
                    const config = statusConfig[record.status];
                    return (
                      <TableRow key={record.id} className="table-row-hover">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <EntityAvatar icon={ClipboardList} shape="rounded" />
                            <div>
                              <span className="font-medium">{getFormName(record.formId)}</span>
                              <p className="text-xs text-muted-foreground">ID: {record.id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getUserName(record.userId)}</TableCell>
                        <TableCell>{getClientName(record.clientId)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(record.createdAt)}</TableCell>
                        <TableCell><Badge variant="outline" className={config.className}>{config.label}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/records/${record.id}`)}><Eye className="h-4 w-4" /></Button>
                            {canValidate && (record.status === "PENDING" || record.status === "SENT") && (
                              <>
                                <Button variant="ghost" size="icon" className="text-success hover:text-success hover:bg-success/10" onClick={() => updateStatus(record.id, "APPROVED")}><Check className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => updateStatus(record.id, "REJECTED")}><X className="h-4 w-4" /></Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ResponsiveTable>
        </CardContent>
      </Card>
    </div>
  );
}
