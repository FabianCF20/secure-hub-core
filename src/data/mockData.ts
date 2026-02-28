import { Client, User, Form, Record, SystemConfig } from "@/models";

// ==========================================
// CLIENTES MOCK
// ==========================================
export const mockClients: Client[] = [
  { id: "client_001", name: "Seguridad Integral del Norte S.A.", code: "SIN-001", isActive: true },
  { id: "client_002", name: "Protección Empresarial Ltda.", code: "PEL-002", isActive: true },
  { id: "client_003", name: "Vigilancia Metropolitana S.A.S.", code: "VIM-003", isActive: true },
  { id: "client_004", name: "Custodia y Resguardo Corp.", code: "CRC-004", isActive: false },
  { id: "client_005", name: "Guardian Security Services", code: "GSS-005", isActive: true },
];

// ==========================================
// USUARIOS MOCK
// ==========================================
export const mockUsers: User[] = [
  {
    id: "user_001",
    fullName: "Carlos Alberto Mendoza",
    email: "carlos.mendoza@seguridadnorte.com",
    role: "ADMIN",
    clientIds: [],
    isActive: true,
  },
  {
    id: "user_002",
    fullName: "María Elena Vargas",
    email: "maria.vargas@seguridadnorte.com",
    role: "CENTRAL",
    clientIds: ["client_001", "client_002", "client_003"],
    isActive: true,
  },
  {
    id: "user_003",
    fullName: "Juan Pablo Rodríguez",
    email: "juan.rodriguez@seguridadnorte.com",
    role: "SUPERVISOR",
    clientIds: ["client_001"],
    isActive: true,
  },
  {
    id: "user_004",
    fullName: "Andrea Patricia López",
    email: "andrea.lopez@proteccionempresarial.com",
    role: "COORDINADOR",
    clientIds: ["client_002", "client_003"],
    isActive: true,
  },
  {
    id: "user_005",
    fullName: "Roberto Carlos Díaz",
    email: "roberto.diaz@proteccionempresarial.com",
    role: "SUPERVISOR",
    clientIds: ["client_002"],
    isActive: true,
  },
  {
    id: "user_006",
    fullName: "Laura Isabel Martínez",
    email: "laura.martinez@vigilanciametro.com",
    role: "COORDINADOR",
    clientIds: ["client_003"],
    isActive: true,
  },
  {
    id: "user_007",
    fullName: "Pedro Antonio Sánchez",
    email: "pedro.sanchez@vigilanciametro.com",
    role: "SUPERVISOR",
    clientIds: ["client_003"],
    isActive: false,
  },
  {
    id: "user_008",
    fullName: "Diana Carolina Ruiz",
    email: "diana.ruiz@guardian.com",
    role: "CLIENTE",
    clientIds: ["client_005"],
    isActive: true,
  },
];

// ==========================================
// FORMULARIOS MOCK
// ==========================================
export const mockForms: Form[] = [
  {
    id: "form_001",
    name: "Control de Acceso Vehicular",
    clientId: "client_001",
    version: 3,
    isActive: true,
    fields: [
      { id: "field_001_01", type: "text", label: "Placa del vehículo", required: true, helperText: "Ingrese la placa sin guiones", validations: { pattern: "^[A-Z]{3}[0-9]{3}$" } },
      { id: "field_001_02", type: "select", label: "Tipo de vehículo", required: true, options: ["Automóvil", "Motocicleta", "Camioneta", "Camión", "Bus"] },
      { id: "field_001_03", type: "text", label: "Nombre del conductor", required: true },
      { id: "field_001_04", type: "text", label: "Número de documento", required: true },
      { id: "field_001_05", type: "text", label: "Motivo de ingreso", required: true },
      { id: "field_001_06", type: "photo", label: "Foto del vehículo", required: true },
      { id: "field_001_07", type: "qr", label: "Código QR de autorización", required: false },
      { id: "field_001_08", type: "signature", label: "Firma del visitante", required: true },
    ],
  },
  {
    id: "form_002",
    name: "Ronda de Vigilancia Nocturna",
    clientId: "client_001",
    version: 2,
    isActive: true,
    fields: [
      { id: "field_002_01", type: "select", label: "Punto de control", required: true, options: ["Entrada Principal", "Parqueadero", "Bodega", "Oficinas", "Perímetro Norte", "Perímetro Sur"] },
      { id: "field_002_02", type: "checkbox", label: "Novedades encontradas", required: false },
      { id: "field_002_03", type: "text", label: "Descripción de novedades", required: false, helperText: "Describa cualquier novedad encontrada" },
      { id: "field_002_04", type: "photo", label: "Evidencia fotográfica", required: false },
      { id: "field_002_05", type: "qr", label: "Código QR del punto", required: true },
    ],
  },
  {
    id: "form_003",
    name: "Inspección de Instalaciones",
    clientId: "client_002",
    version: 1,
    isActive: true,
    fields: [
      { id: "field_003_01", type: "select", label: "Área inspeccionada", required: true, options: ["Recepción", "Sala de juntas", "Cafetería", "Baños", "Archivo", "Datacenter"] },
      { id: "field_003_02", type: "checkbox", label: "Puertas aseguradas", required: true },
      { id: "field_003_03", type: "checkbox", label: "Luces apagadas", required: true },
      { id: "field_003_04", type: "checkbox", label: "Equipos desconectados", required: true },
      { id: "field_003_05", type: "number", label: "Temperatura ambiente (°C)", required: false, validations: { min: 0, max: 50 } },
      { id: "field_003_06", type: "text", label: "Observaciones adicionales", required: false },
    ],
  },
  {
    id: "form_004",
    name: "Control de Visitantes",
    clientId: "client_003",
    version: 1,
    isActive: true,
    fields: [
      { id: "field_004_01", type: "text", label: "Nombre completo del visitante", required: true },
      { id: "field_004_02", type: "text", label: "Documento de identidad", required: true },
      { id: "field_004_03", type: "text", label: "Empresa que representa", required: false },
      { id: "field_004_04", type: "text", label: "Persona a visitar", required: true },
      { id: "field_004_05", type: "select", label: "Motivo de visita", required: true, options: ["Reunión", "Entrega", "Mantenimiento", "Auditoría", "Capacitación", "Otro"] },
      { id: "field_004_06", type: "photo", label: "Foto del visitante", required: true },
      { id: "field_004_07", type: "signature", label: "Firma de aceptación", required: true },
    ],
  },
  {
    id: "form_005",
    name: "Reporte de Incidentes",
    clientId: "client_005",
    version: 2,
    isActive: true,
    fields: [
      { id: "field_005_01", type: "select", label: "Tipo de incidente", required: true, options: ["Robo", "Vandalismo", "Accidente", "Incendio", "Fuga de agua", "Intrusión", "Otro"] },
      { id: "field_005_02", type: "select", label: "Gravedad", required: true, options: ["Baja", "Media", "Alta", "Crítica"] },
      { id: "field_005_03", type: "text", label: "Ubicación exacta", required: true },
      { id: "field_005_04", type: "text", label: "Descripción detallada", required: true, helperText: "Proporcione todos los detalles del incidente" },
      { id: "field_005_05", type: "text", label: "Personas involucradas", required: false },
      { id: "field_005_06", type: "photo", label: "Evidencia fotográfica 1", required: true },
      { id: "field_005_07", type: "photo", label: "Evidencia fotográfica 2", required: false },
      { id: "field_005_08", type: "checkbox", label: "Autoridades notificadas", required: false },
      { id: "field_005_09", type: "text", label: "Acciones tomadas", required: true },
    ],
  },
  {
    id: "form_006",
    name: "Entrega de Turno",
    clientId: "client_001",
    version: 1,
    isActive: false,
    fields: [
      { id: "field_006_01", type: "text", label: "Guardia entrante", required: true },
      { id: "field_006_02", type: "text", label: "Guardia saliente", required: true },
      { id: "field_006_03", type: "text", label: "Novedades del turno", required: false },
      { id: "field_006_04", type: "checkbox", label: "Equipos entregados correctamente", required: true },
      { id: "field_006_05", type: "signature", label: "Firma guardia entrante", required: true },
      { id: "field_006_06", type: "signature", label: "Firma guardia saliente", required: true },
    ],
  },
];

// ==========================================
// REGISTROS MOCK
// ==========================================
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const twoDaysAgo = new Date(today);
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

export const mockRecords: Record[] = [
  {
    id: "record_001",
    formId: "form_001",
    clientId: "client_001",
    userId: "user_003",
    createdAt: today.toISOString(),
    status: "PENDING",
    answers: [
      { fieldId: "field_001_01", value: "ABC123" },
      { fieldId: "field_001_02", value: "Automóvil" },
      { fieldId: "field_001_03", value: "Fernando Gómez" },
      { fieldId: "field_001_04", value: "1234567890" },
      { fieldId: "field_001_05", value: "Visita comercial" },
    ],
    evidence: {
      photos: ["https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400"],
      signature: "data:image/png;base64,signature_data_here",
      qrValue: "AUTH-2024-001",
    },
    observations: "",
  },
  {
    id: "record_002",
    formId: "form_002",
    clientId: "client_001",
    userId: "user_003",
    createdAt: today.toISOString(),
    status: "APPROVED",
    answers: [
      { fieldId: "field_002_01", value: "Entrada Principal" },
      { fieldId: "field_002_02", value: "false" },
      { fieldId: "field_002_03", value: "" },
    ],
    evidence: { photos: [], signature: "", qrValue: "CTRL-EP-001" },
    observations: "Ronda completada sin novedades.",
  },
  {
    id: "record_003",
    formId: "form_001",
    clientId: "client_001",
    userId: "user_003",
    createdAt: yesterday.toISOString(),
    status: "SENT",
    answers: [
      { fieldId: "field_001_01", value: "XYZ789" },
      { fieldId: "field_001_02", value: "Camioneta" },
      { fieldId: "field_001_03", value: "María García" },
      { fieldId: "field_001_04", value: "9876543210" },
      { fieldId: "field_001_05", value: "Entrega de mercancía" },
    ],
    evidence: {
      photos: ["https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400"],
      signature: "data:image/png;base64,signature_data_here",
      qrValue: "AUTH-2024-002",
    },
    observations: "",
  },
  {
    id: "record_004",
    formId: "form_003",
    clientId: "client_002",
    userId: "user_005",
    createdAt: yesterday.toISOString(),
    status: "APPROVED",
    answers: [
      { fieldId: "field_003_01", value: "Datacenter" },
      { fieldId: "field_003_02", value: "true" },
      { fieldId: "field_003_03", value: "true" },
      { fieldId: "field_003_04", value: "true" },
      { fieldId: "field_003_05", value: "22" },
      { fieldId: "field_003_06", value: "Todo en orden" },
    ],
    evidence: { photos: [], signature: "", qrValue: "" },
    observations: "Inspección de rutina sin hallazgos.",
  },
  {
    id: "record_005",
    formId: "form_004",
    clientId: "client_003",
    userId: "user_007",
    createdAt: twoDaysAgo.toISOString(),
    status: "REJECTED",
    answers: [
      { fieldId: "field_004_01", value: "Andrés Pérez" },
      { fieldId: "field_004_02", value: "CC 1122334455" },
      { fieldId: "field_004_03", value: "Tech Solutions" },
      { fieldId: "field_004_04", value: "Gerente de TI" },
      { fieldId: "field_004_05", value: "Mantenimiento" },
    ],
    evidence: {
      photos: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"],
      signature: "data:image/png;base64,signature_data_here",
      qrValue: "",
    },
    observations: "Documento de identidad ilegible.",
  },
  {
    id: "record_006",
    formId: "form_005",
    clientId: "client_005",
    userId: "user_008",
    createdAt: twoDaysAgo.toISOString(),
    status: "PENDING",
    answers: [
      { fieldId: "field_005_01", value: "Vandalismo" },
      { fieldId: "field_005_02", value: "Media" },
      { fieldId: "field_005_03", value: "Parqueadero nivel 2" },
      { fieldId: "field_005_04", value: "Grafiti en pared sur del parqueadero" },
      { fieldId: "field_005_05", value: "Desconocido" },
      { fieldId: "field_005_08", value: "false" },
      { fieldId: "field_005_09", value: "Se tomó evidencia fotográfica y se reportó a administración" },
    ],
    evidence: {
      photos: [
        "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400",
        "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400",
      ],
      signature: "",
      qrValue: "",
    },
    observations: "",
  },
];

// ==========================================
// CONFIGURACIÓN DEL SISTEMA
// ==========================================
export const mockSystemConfig: SystemConfig = {
  companyName: "SecureOps Platform",
  companyLogo: "",
  primaryColor: "#1e3a5f",
  secondaryColor: "#3b82f6",
  timezone: "America/Bogota",
};
