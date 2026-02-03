import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Eye, Check, X, ClipboardList } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recordService, clientService, formService, userService } from "@/services";
import { Record as RecordType, Client, Form, User, RecordStatus } from "@/models";
import { toast } from "sonner";

const statusConfig: { [key in RecordStatus]: { label: string; className: string } } = {
  PENDING: { label: "Pendiente", className: "status-pending" },
  SENT: { label: "Enviado", className: "status-sent" },
  APPROVED: { label: "Aprobado", className: "status-approved" },
  REJECTED: { label: "Rechazado", className: "status-rejected" },
};

export default function Records() {
  const navigate = useNavigate();
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

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = records;

    if (filterClient !== "all") {
      filtered = filtered.filter((r) => r.clientId === filterClient);
    }

    if (filterForm !== "all") {
      filtered = filtered.filter((r) => r.formId === filterForm);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((r) => r.status === filterStatus);
    }

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
        recordService.getRecords(),
        clientService.getClients(),
        formService.getForms(),
        userService.getUsers(),
      ]);
      setRecords(recordsData);
      setClients(clientsData);
      setForms(formsData);
      setUsers(usersData);
    } catch (error) {
      toast.error("Error al cargar registros");
    } finally {
      setLoading(false);
    }
  }

  function getClientName(clientId: string): string {
    return clients.find((c) => c.id === clientId)?.name || "—";
  }

  function getFormName(formId: string): string {
    return forms.find((f) => f.id === formId)?.name || "—";
  }

  function getUserName(userId: string): string {
    return users.find((u) => u.id === userId)?.fullName || "—";
  }

  function formatDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function updateStatus(recordId: string, status: RecordStatus) {
    try {
      await recordService.updateRecordStatus(recordId, status);
      toast.success(`Registro ${status === "APPROVED" ? "aprobado" : "rechazado"}`);
      loadData();
    } catch (error) {
      toast.error("Error al actualizar estado");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Cargando registros...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Registros Diligenciados</h1>
        <p className="page-description">
          Gestiona y aprueba los formularios completados
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Historial de Registros</CardTitle>
                <CardDescription>{records.length} registros en total</CardDescription>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por usuario..."
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
              <Select value={filterForm} onValueChange={setFilterForm}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Formulario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los formularios</SelectItem>
                  {forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name}
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
                  <SelectItem value="PENDING">Pendiente</SelectItem>
                  <SelectItem value="SENT">Enviado</SelectItem>
                  <SelectItem value="APPROVED">Aprobado</SelectItem>
                  <SelectItem value="REJECTED">Rechazado</SelectItem>
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <ClipboardList className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <span className="font-medium">{getFormName(record.formId)}</span>
                          <p className="text-xs text-muted-foreground">ID: {record.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getUserName(record.userId)}</TableCell>
                    <TableCell>{getClientName(record.clientId)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(record.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={config.className}>
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/records/${record.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(record.status === "PENDING" || record.status === "SENT") && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-success hover:text-success hover:bg-success/10"
                              onClick={() => updateStatus(record.id, "APPROVED")}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => updateStatus(record.id, "REJECTED")}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
