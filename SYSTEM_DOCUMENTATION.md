# 📋 AINCA — Documentación Completa del Sistema

## Índice

1. [Descripción General](#descripción-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Estructura de Archivos](#estructura-de-archivos)
5. [Modelos de Datos](#modelos-de-datos)
6. [Sistema de Roles y Permisos](#sistema-de-roles-y-permisos)
7. [Navegación por Rol](#navegación-por-rol)
8. [Servicios y Capa de Abstracción](#servicios-y-capa-de-abstracción)
9. [Autenticación](#autenticación)
10. [Páginas y Funcionalidades](#páginas-y-funcionalidades)
11. [Componentes Compartidos](#componentes-compartidos)
12. [Sistema de Diseño](#sistema-de-diseño)
13. [Mejoras y Recomendaciones](#mejoras-y-recomendaciones)

---

## Descripción General

**AINCA** es un panel administrativo web para la gestión de formularios operativos en empresas de seguridad privada. Permite crear formularios personalizados, asignarlos a clientes, diligenciarlos en campo y validarlos a través de una jerarquía de roles.

### Funcionalidades Principales

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | Vista general con estadísticas, gráficos y actividad reciente |
| **Clientes** | CRUD de empresas cliente con código y estado activo/inactivo |
| **Usuarios** | Gestión de usuarios con roles, asignación multi-cliente |
| **Formularios** | Creación visual de formularios con campos dinámicos |
| **Registros** | Visualización y validación de formularios diligenciados |
| **Reportes** | Informes y analíticas del sistema |
| **Configuración** | Ajustes generales del sistema |

---

## Stack Tecnológico

| Tecnología | Versión | Uso |
|------------|---------|-----|
| **React** | 18.3 | Framework de UI |
| **TypeScript** | 5.x | Tipado estático |
| **Vite** | 5.x | Bundler y dev server |
| **Tailwind CSS** | 3.x | Estilos utilitarios |
| **shadcn/ui** | Última | Componentes de UI base |
| **React Router** | 6.30 | Navegación SPA |
| **React Query** | 5.83 | Cache y gestión de estado servidor |
| **Recharts** | 2.15 | Gráficos y visualizaciones |
| **Firebase** | 12.9 | Auth + Firestore (producción) |
| **Lucide React** | 0.462 | Iconografía |
| **React Hook Form** | 7.61 | Gestión de formularios |
| **Zod** | 3.25 | Validación de esquemas |
| **date-fns** | 3.6 | Manipulación de fechas |

---

## Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────┐
│                     FRONTEND                          │
│          React + TypeScript + Vite + Tailwind         │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Páginas    │  │  Componentes │  │   Contextos   │ │
│  │  Dashboard   │  │   Layout     │  │  AuthContext   │ │
│  │  Clients     │  │   Shared     │  │               │ │
│  │  Users       │  │   UI (shadcn)│  │               │ │
│  │  Forms       │  │              │  │               │ │
│  │  Records     │  │              │  │               │ │
│  └──────┬───────┘  └──────────────┘  └──────┬────────┘ │
│         │                                    │          │
│  ┌──────▼────────────────────────────────────▼────────┐ │
│  │            SERVICE ADAPTER LAYER                    │ │
│  │         src/services/serviceAdapter.ts               │ │
│  │  (Selecciona mock o Firebase según USE_FIREBASE)    │ │
│  ├─────────────────┬───────────────────────────────────┤ │
│  │  Mock Services  │       Firebase Services            │ │
│  │  (In-memory)    │  (Firestore + Auth reales)         │ │
│  │  authService    │  firebaseAuthService               │ │
│  │  clientService  │  firebaseClientService             │ │
│  │  userService    │  firebaseUserService               │ │
│  │  formService    │  firebaseFormService               │ │
│  │  recordService  │  firebaseRecordService             │ │
│  └─────────────────┴───────────────────────────────────┘ │
│                          │                               │
├──────────────────────────▼───────────────────────────────┤
│                   FIREBASE SDK                            │
│       firebase/app · firebase/auth · firebase/firestore   │
├──────────────────────────────────────────────────────────┤
│                 FIREBASE BACKEND                          │
│      Authentication  │  Firestore  │  Storage             │
│      (Email/Pass)    │  (NoSQL DB) │  (Archivos)          │
└──────────────────────────────────────────────────────────┘
```

---

## Estructura de Archivos

```
src/
├── App.tsx                          # Rutas principales y providers
├── main.tsx                         # Punto de entrada
├── index.css                        # Tokens de diseño y estilos globales
│
├── models/
│   └── index.ts                     # Interfaces TypeScript de todo el sistema
│
├── config/
│   └── navigation.ts                # Navegación con control de acceso por rol
│
├── contexts/
│   └── AuthContext.tsx               # Estado global de autenticación
│
├── firebase/
│   ├── config.ts                    # ⭐ Configuración Firebase (credenciales)
│   ├── collections.ts               # Nombres de colecciones Firestore
│   ├── converters.ts                # Type-safety para Firestore
│   └── index.ts                     # Re-exports
│
├── services/
│   ├── serviceAdapter.ts            # ⭐ Switch automático mock ↔ Firebase
│   ├── authService.ts               # Auth mock (desarrollo)
│   ├── clientService.ts             # Clientes mock
│   ├── userService.ts               # Usuarios mock
│   ├── formService.ts               # Formularios mock
│   ├── recordService.ts             # Registros mock
│   ├── dashboardService.ts          # Estadísticas (usa datos de otros servicios)
│   └── firebase/
│       ├── firebaseAuthService.ts   # Auth real con Firebase Auth
│       ├── firebaseClientService.ts # CRUD clientes en Firestore
│       ├── firebaseUserService.ts   # CRUD usuarios (Auth + Firestore)
│       ├── firebaseFormService.ts   # CRUD formularios en Firestore
│       ├── firebaseRecordService.ts # CRUD registros en Firestore
│       └── index.ts
│
├── data/
│   └── mockData.ts                  # Datos de prueba para desarrollo
│
├── pages/
│   ├── Dashboard.tsx                # Panel principal con estadísticas
│   ├── Clients.tsx                  # Gestión de clientes
│   ├── Users.tsx                    # Gestión de usuarios y roles
│   ├── Forms.tsx                    # Listado de formularios
│   ├── FormBuilder.tsx              # Constructor visual de formularios
│   ├── Records.tsx                  # Listado de registros
│   ├── RecordDetail.tsx             # Detalle de un registro
│   ├── Reports.tsx                  # Reportes y analíticas
│   ├── Settings.tsx                 # Configuración del sistema
│   ├── Login.tsx                    # Pantalla de inicio de sesión
│   └── NotFound.tsx                 # Página 404
│
├── components/
│   ├── ProtectedRoute.tsx           # HOC para rutas autenticadas
│   ├── NavLink.tsx                  # Link de navegación activo
│   ├── layout/
│   │   ├── MainLayout.tsx           # Layout con sidebar + topbar
│   │   ├── AppSidebar.tsx           # Sidebar desktop (filtrado por rol)
│   │   ├── MobileSidebar.tsx        # Sidebar móvil (filtrado por rol)
│   │   └── Topbar.tsx               # Barra superior con usuario
│   ├── shared/
│   │   ├── PageHeader.tsx           # Encabezado reutilizable de página
│   │   ├── LoadingState.tsx         # Estado de carga
│   │   ├── SearchInput.tsx          # Input de búsqueda
│   │   ├── FilterBar.tsx            # Barra de filtros
│   │   ├── StatusBadge.tsx          # Badge de estado (colores semánticos)
│   │   ├── EntityAvatar.tsx         # Avatar de entidad
│   │   ├── ConfirmDialog.tsx        # Diálogo de confirmación
│   │   └── ResponsiveTable.tsx      # Tabla adaptativa
│   └── ui/                          # ~40+ componentes shadcn/ui
│
├── hooks/
│   ├── use-mobile.tsx               # Detección de pantalla móvil
│   └── use-toast.ts                 # Sistema de notificaciones
│
└── lib/
    └── utils.ts                     # Utilidad cn() para clases CSS

Archivos raíz:
├── firestore.rules                  # Reglas de seguridad de Firestore
├── FIREBASE_DOCUMENTATION.md        # Guía de conexión Firebase
├── SYSTEM_DOCUMENTATION.md          # Este archivo
└── tailwind.config.ts               # Configuración de Tailwind
```

---

## Modelos de Datos

### Client (Cliente)

```typescript
interface Client {
  id: string;        // Auto-generado por Firestore
  name: string;      // "Seguridad Integral del Norte S.A."
  code: string;      // "SIN-001" (código interno)
  isActive: boolean;  // Soft-delete: false = desactivado
}
```

### User (Usuario)

```typescript
type UserRole = "ADMIN" | "CENTRAL" | "SUPERVISOR" | "COORDINADOR" | "CLIENTE";

interface User {
  id: string;          // En Firebase: UID de Auth = ID del documento
  fullName: string;
  email: string;
  role: UserRole;
  clientIds: string[]; // Array de IDs de clientes asignados (puede estar vacío)
  isActive: boolean;
}
```

> **Nota importante:** El campo `clientIds` es un **array**, lo que permite que un usuario gestione múltiples clientes. Los usuarios CENTRAL, SUPERVISOR y COORDINADOR pueden existir sin clientes asignados (`clientIds: []`).

### Form (Formulario / Plantilla)

```typescript
type FieldType = "text" | "number" | "select" | "checkbox" | "photo" | "signature" | "qr";

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];          // Solo para tipo "select"
  helperText?: string;
  validations?: {
    min?: number;
    max?: number;
    pattern?: string;          // Regex
  };
}

interface Form {
  id: string;
  name: string;
  clientId: string;             // A qué cliente pertenece
  version: number;              // Control de versiones
  isActive: boolean;
  fields: FormField[];          // Campos del formulario
}
```

### Record (Registro Diligenciado)

```typescript
type RecordStatus = "PENDING" | "SENT" | "APPROVED" | "REJECTED";

interface Record {
  id: string;
  formId: string;               // Qué formulario se llenó
  clientId: string;             // A qué cliente pertenece
  userId: string;               // Quién lo llenó (Supervisor)
  createdAt: string;            // ISO 8601
  status: RecordStatus;
  answers: FieldAnswer[];       // Respuestas campo por campo
  evidence: RecordEvidence;     // Fotos, firma, QR
  observations: string;         // Notas del validador
}
```

### SystemConfig (Configuración Global)

```typescript
interface SystemConfig {
  companyName: string;
  companyLogo: string;
  primaryColor: string;
  secondaryColor: string;
  timezone: string;
}
```

---

## Sistema de Roles y Permisos

### Matriz de Permisos Completa

| Acción | ADMIN | CENTRAL | SUPERVISOR | COORDINADOR | CLIENTE |
|--------|:-----:|:-------:|:----------:|:-----------:|:-------:|
| **USUARIOS** |
| Crear usuarios | ✅ | ❌ | ❌ | ❌ | ❌ |
| Editar usuarios | ✅ | ❌ | ❌ | ❌ | ❌ |
| Desactivar usuarios | ✅ | ❌ | ❌ | ❌ | ❌ |
| Asignar clientes a usuarios | ✅ | ❌ | ❌ | ❌ | ❌ |
| **CLIENTES** |
| Crear clientes | ✅ | ❌ | ❌ | ❌ | ❌ |
| Editar clientes | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver todos los clientes | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver clientes asignados | — | — | ✅ | ✅ | ✅ |
| **FORMULARIOS** |
| Crear formularios | ❌ | ✅ | ❌ | ❌ | ❌ |
| Editar formularios | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver TODOS los formularios | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver formularios de sus clientes | — | — | ✅ | ✅ | ✅ |
| **REGISTROS** |
| Diligenciar (crear) registros | ❌ | ❌ | ✅ | ❌ | ❌ |
| Ver TODOS los registros | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver sus propios registros | — | — | ✅ | ❌ | ❌ |
| Ver registros de sus clientes | — | — | — | ✅ | ✅ |
| Validar (aprobar/rechazar) TODOS | ✅ | ✅ | ❌ | ❌ | ❌ |
| Validar registros de sus clientes | — | — | ❌ | ✅ | ❌ |
| **SISTEMA** |
| Reportes | ✅ | ❌ | ❌ | ✅ | ❌ |
| Configuración del sistema | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |

### Descripción Detallada por Rol

#### 🔴 ADMIN (Administrador)
- **Gestión total** del sistema: usuarios, clientes, configuración.
- Puede asignar uno, varios o ningún cliente a cualquier usuario.
- No crea formularios directamente (eso es rol del CENTRAL).
- Tiene visibilidad completa de todos los datos.

#### 🟠 CENTRAL
- **Creador y gestor de formularios** para todos los clientes.
- Visibilidad global: ve todos los formularios y registros sin restricción de cliente.
- **Valida registros** de cualquier cliente, sin importar qué supervisor lo haya diligenciado.
- No gestiona usuarios ni clientes.

#### 🟡 SUPERVISOR
- **Operador de campo**: diligencia (llena) los formularios asignados.
- Solo ve sus propios registros creados.
- **No puede validar** registros (ni propios ni ajenos).
- Puede tener múltiples clientes asignados.

#### 🟢 COORDINADOR
- **Gestión regional/por cliente**: solo ve datos de sus clientes asignados.
- **Valida registros** de sus clientes, sin importar qué supervisor los creó.
- No puede crear formularios ni usuarios.
- Acceso a reportes de sus clientes.

#### 🔵 CLIENTE
- **Acceso de solo lectura** a sus propios formularios y registros.
- No puede crear, editar ni validar nada.
- Vista limitada exclusivamente a su cuenta.

---

## Navegación por Rol

Definida en `src/config/navigation.ts`:

| Módulo | ADMIN | CENTRAL | SUPERVISOR | COORDINADOR | CLIENTE |
|--------|:-----:|:-------:|:----------:|:-----------:|:-------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Clientes | ✅ | ❌ | ❌ | ❌ | ❌ |
| Usuarios | ✅ | ❌ | ❌ | ❌ | ❌ |
| Formularios | ✅ | ✅ | ✅ | ✅ | ✅ |
| Registros | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reportes | ✅ | ❌ | ❌ | ✅ | ❌ |
| Configuración | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Servicios y Capa de Abstracción

### Service Adapter Pattern

El sistema utiliza un **patrón adaptador** que permite alternar entre datos mock (desarrollo) y Firebase (producción) sin cambiar ningún componente:

```typescript
// src/services/serviceAdapter.ts
import { USE_FIREBASE } from "@/firebase/config";

export const activeAuthService    = USE_FIREBASE ? firebaseAuthService    : mockAuthService;
export const activeClientService  = USE_FIREBASE ? firebaseClientService  : mockClientService;
export const activeUserService    = USE_FIREBASE ? firebaseUserService    : mockUserService;
export const activeFormService    = USE_FIREBASE ? firebaseFormService    : mockFormService;
export const activeRecordService  = USE_FIREBASE ? firebaseRecordService  : mockRecordService;
```

### Servicios Disponibles

| Servicio | Mock | Firebase | Operaciones |
|----------|------|----------|-------------|
| **Auth** | `authService` | `firebaseAuthService` | login, logout, getStoredUser, createAuthAccount |
| **Clients** | `clientService` | `firebaseClientService` | getClients, getClientById, createClient, updateClient, toggleStatus |
| **Users** | `userService` | `firebaseUserService` | getUsers, getUserById, getUsersByClient, createUser, updateUser, toggleStatus |
| **Forms** | `formService` | `firebaseFormService` | getForms, getFormById, getFormsByClient, createForm, updateForm, cloneForm, toggleStatus |
| **Records** | `recordService` | `firebaseRecordService` | getRecords, getRecordById, getRecordsByClient/Form/User/Status, updateStatus |
| **Dashboard** | `dashboardService` | — | getStats, getChartData, getRecentActivity |

---

## Autenticación

### Flujo de Login

```
1. Usuario ingresa email + password en /login
2. AuthContext llama a authService.login(credentials)
3. Si USE_FIREBASE=true:
   a. Firebase Auth: signInWithEmailAndPassword()
   b. Firestore: getDoc(users/{UID}) → carga perfil
   c. Valida isActive === true
4. Si USE_FIREBASE=false:
   a. Verifica contra mockAuthAccounts en memoria
   b. Busca perfil en mockUsers[]
5. Perfil guardado en localStorage + state de React
6. ProtectedRoute permite acceso a rutas internas
7. Sidebar se filtra según el rol del usuario
```

### Flujo de Creación de Usuario (desde ADMIN)

```
1. Admin completa formulario: nombre, email, password, rol, clientes
2. Firebase Auth: createUserWithEmailAndPassword() → genera UID
3. Firestore: setDoc(users/{UID}, perfil) → sincroniza UID
4. Usuario listo para hacer login
```

> **⚠️ Limitación actual:** `createUserWithEmailAndPassword()` cierra la sesión del admin actual. Ver sección de [Mejoras](#mejoras-y-recomendaciones).

---

## Páginas y Funcionalidades

### `/login` — Login
- Formulario de email y password.
- Validación de credenciales contra Firebase Auth o mock.
- Manejo de errores con mensajes descriptivos en español.

### `/` — Dashboard
- 6 tarjetas de estadísticas (clientes, usuarios, formularios, registros, hoy, pendientes).
- Gráfico de barras: registros por cliente.
- Gráfico de torta: distribución por estado.
- Lista de actividad reciente con links a registros.

### `/clients` — Clientes (solo ADMIN)
- Tabla con búsqueda y filtro por estado.
- CRUD completo: crear, editar nombre/código, activar/desactivar.
- No se eliminan registros: soft-delete con `isActive: false`.

### `/users` — Usuarios (solo ADMIN)
- Tabla con búsqueda y filtros por rol y estado.
- Selector de múltiples clientes (checkboxes).
- Creación con email + password + rol + clientes.
- Activar/desactivar usuarios.

### `/forms` — Formularios
- Listado con filtros por cliente y estado.
- Visibilidad según rol (todos vs. solo clientes asignados).
- Acceso a FormBuilder para edición.

### `/forms/builder/:formId?` — Constructor de Formularios
- Editor visual drag-and-drop de campos.
- Tipos: text, number, select, checkbox, photo, signature, qr.
- Validaciones configurables por campo.
- Versionado automático.

### `/records` — Registros
- Listado filtrable por cliente, formulario, estado.
- Acceso a detalle de cada registro.

### `/records/:recordId` — Detalle de Registro
- Visualización de respuestas campo por campo.
- Evidencia: fotos, firma digital, QR.
- Botones de validación (aprobar/rechazar) según rol.

### `/reports` — Reportes (ADMIN + COORDINADOR)
- Analíticas y estadísticas filtradas por contexto del rol.

### `/settings` — Configuración (solo ADMIN)
- Nombre de empresa, logo, colores, zona horaria.

---

## Componentes Compartidos

| Componente | Archivo | Uso |
|------------|---------|-----|
| `PageHeader` | `shared/PageHeader.tsx` | Título + descripción de cada página |
| `LoadingState` | `shared/LoadingState.tsx` | Spinner con mensaje durante cargas |
| `SearchInput` | `shared/SearchInput.tsx` | Input de búsqueda con debounce |
| `FilterBar` | `shared/FilterBar.tsx` | Barra de filtros combinables |
| `StatusBadge` | `shared/StatusBadge.tsx` | Badge con color por estado (PENDING, APPROVED, etc.) |
| `EntityAvatar` | `shared/EntityAvatar.tsx` | Avatar con iniciales de entidad |
| `ConfirmDialog` | `shared/ConfirmDialog.tsx` | Modal de confirmación para acciones destructivas |
| `ResponsiveTable` | `shared/ResponsiveTable.tsx` | Tabla que se adapta a móvil |
| `ProtectedRoute` | `ProtectedRoute.tsx` | HOC que redirige a /login si no hay sesión |

---

## Sistema de Diseño

### Tokens CSS (index.css)

El sistema usa variables CSS HSL para theming con soporte de modo oscuro:

```css
:root {
  --background: 210 40% 98%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --secondary: 210 40% 96.1%;
  --muted: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --destructive: 0 84.2% 60.2%;
  /* ... más tokens */
}
```

### Reglas de Uso

1. **Nunca** usar colores directos en componentes (`text-white`, `bg-blue-500`).
2. **Siempre** usar tokens semánticos: `text-foreground`, `bg-primary`, `text-muted-foreground`.
3. Los componentes shadcn/ui ya usan tokens correctamente.
4. Nuevos colores deben agregarse a `tailwind.config.ts`.

---

## Mejoras y Recomendaciones

### 🔴 Críticas (Seguridad/Funcionalidad)

1. **AuthContext no usa serviceAdapter:** Actualmente importa directamente `authService` (mock). Debe importar desde `serviceAdapter.ts` para que funcione con Firebase en producción.

   ```typescript
   // ❌ Actual
   import { authService } from "@/services/authService";
   // ✅ Correcto
   import { activeAuthService as authService } from "@/services/serviceAdapter";
   ```

2. **Creación de usuarios cierra sesión del admin:** `createUserWithEmailAndPassword()` de Firebase Auth cambia el usuario autenticado. Solución: usar Firebase Admin SDK desde una Cloud Function, o re-autenticar al admin después de crear el usuario.

3. **Dashboard usa servicios mock directamente:** `dashboardService.ts` importa desde servicios mock. Debe usar `serviceAdapter` o crear un `firebaseDashboardService`.

### 🟡 Importantes (Funcionalidad)

4. **Filtrado de datos por rol no implementado en páginas:** Las páginas de Formularios, Registros y Dashboard muestran todos los datos sin filtrar según `clientIds` del usuario logueado. Cada página debería:
   - CENTRAL/ADMIN: ver todo.
   - SUPERVISOR: ver solo sus registros (`userId === currentUser.id`).
   - COORDINADOR/CLIENTE: ver solo datos de `clientIds` asignados.

5. **No hay validación de rutas por rol:** `ProtectedRoute` solo verifica autenticación, pero no impide que un SUPERVISOR acceda a `/clients` o `/users` directamente por URL. Debe validar contra `navItems[].allowedRoles`.

6. **Falta `addDoc` en `firebaseRecordService`:** No hay método `createRecord()` para que supervisores creen registros desde la app.

### 🟢 Mejoras (UX/DX)

7. **Usar `onAuthStateChanged` en AuthContext:** En lugar de solo leer localStorage al cargar, escuchar cambios de sesión de Firebase Auth para sincronizar estado en tiempo real.

8. **Implementar paginación:** Los servicios Firebase cargan todos los documentos con `getDocs()`. Para bases de datos grandes, usar `limit()`, `startAfter()` y cursores.

9. **Agregar indicadores de carga optimistas:** Mostrar feedback inmediato al crear/editar/eliminar antes de confirmar con el servidor.

10. **Agregar validación de formularios con Zod:** Zod ya está instalado pero no se usa en todas las páginas. Implementar esquemas de validación consistentes.

11. **Logs de auditoría:** Registrar quién hizo qué y cuándo (creación, edición, validación) en una colección `auditLogs` de Firestore.

12. **Notificaciones en tiempo real:** Usar `onSnapshot` de Firestore para actualizaciones en vivo cuando se crean/validan registros.

---

> **📌 Para la guía de conexión a Firebase, consulta el archivo `FIREBASE_DOCUMENTATION.md`.**
