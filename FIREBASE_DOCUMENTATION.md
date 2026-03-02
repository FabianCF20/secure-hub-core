# 🔥 AINCA — Guía de Conexión a Firebase

## Índice

1. [Resumen de Integración](#resumen-de-integración)
2. [Configuración Paso a Paso](#configuración-paso-a-paso)
3. [Estructura de Firestore](#estructura-de-firestore)
4. [Autenticación (Firebase Auth)](#autenticación-firebase-auth)
5. [Reglas de Seguridad](#reglas-de-seguridad)
6. [Service Adapter — Cómo Funciona](#service-adapter--cómo-funciona)
7. [Crear el Primer Usuario ADMIN](#crear-el-primer-usuario-admin)
8. [Índices de Firestore](#índices-de-firestore)
9. [Firebase CLI (Opcional)](#firebase-cli-opcional)
10. [Troubleshooting](#troubleshooting)
11. [Mejoras Recomendadas para Firebase](#mejoras-recomendadas-para-firebase)

---

## Resumen de Integración

El proyecto está **configurado y conectado** al proyecto Firebase `ainca-6cf4d`. La conexión se activa automáticamente cuando `firebaseConfig.apiKey` es distinto de un placeholder.

| Componente | Estado | Archivo |
|-----------|--------|---------|
| SDK Firebase | ✅ Instalado (v12.9) | `package.json` |
| Configuración | ✅ Conectado a `ainca-6cf4d` | `src/firebase/config.ts` |
| Auth Service | ✅ Implementado | `src/services/firebase/firebaseAuthService.ts` |
| Client Service | ✅ Implementado | `src/services/firebase/firebaseClientService.ts` |
| User Service | ✅ Implementado | `src/services/firebase/firebaseUserService.ts` |
| Form Service | ✅ Implementado | `src/services/firebase/firebaseFormService.ts` |
| Record Service | ✅ Implementado | `src/services/firebase/firebaseRecordService.ts` |
| Security Rules | ✅ Definidas | `firestore.rules` |
| Service Adapter | ✅ Configurado | `src/services/serviceAdapter.ts` |
| Converters | ✅ Tipados | `src/firebase/converters.ts` |

---

## Configuración Paso a Paso

### Paso 1: Proyecto Firebase (Ya completado)

El proyecto utiliza las siguientes credenciales públicas:

```typescript
// src/firebase/config.ts
const firebaseConfig = {
  apiKey: "AIzaSyAQc1oiccBE-Py1Nc2EXHVZ6jA6ZY7Ew_w",
  authDomain: "ainca-6cf4d.firebaseapp.com",
  projectId: "ainca-6cf4d",
  storageBucket: "ainca-6cf4d.firebasestorage.app",
  messagingSenderId: "327745320667",
  appId: "1:327745320667:web:571ba0963669f1387f7efe",
  measurementId: "G-6HVDMERTFK",
};
```

> ⚠️ Estas claves son **publishable keys** (públicas por diseño). La seguridad se controla con Firebase Auth + Firestore Security Rules, no ocultando estas claves.

### Paso 2: Activar Authentication en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/) → Proyecto `ainca-6cf4d`
2. Menú lateral → **Authentication** → **Sign-in method**
3. Activa **Email/Password** → Guardar
4. (Opcional) Activa **Google** si deseas login social

### Paso 3: Crear Base de Datos Firestore

1. Firebase Console → **Firestore Database**
2. Clic en **"Crear base de datos"**
3. Selecciona modo **Producción**
4. Ubicación: **us-east1** o la más cercana a tus usuarios en Colombia
5. Clic en **"Crear"**

### Paso 4: Configurar Reglas de Seguridad

1. Firestore Database → **Rules**
2. Copia **todo el contenido** del archivo `firestore.rules` del proyecto
3. Pégalo reemplazando las reglas por defecto
4. Clic en **"Publicar"**

### Paso 5: Crear los Índices

Ve a Firestore → **Indexes** → Crear los índices listados en la [sección de índices](#índices-de-firestore).

> **Tip:** Firebase también genera links automáticos en la consola del navegador cuando una consulta necesita un índice. Solo haz clic para crearlo.

---

## Estructura de Firestore

### Colecciones

```
firestore/
├── clients/           # Empresas cliente
│   └── {clientId}     # ID auto-generado
├── users/             # Perfiles de usuario
│   └── {userId}       # ID = Firebase Auth UID ⚠️
├── forms/             # Plantillas de formularios
│   └── {formId}       # ID auto-generado
├── records/           # Registros diligenciados
│   └── {recordId}     # ID auto-generado
└── systemConfig/      # Configuración global
    └── main           # Documento único
```

### Esquemas de Documentos

#### `clients/{clientId}`

```json
{
  "name": "Seguridad Integral del Norte S.A.",
  "code": "SIN-001",
  "isActive": true
}
```

#### `users/{userId}` ⚠️ ID = Firebase Auth UID

```json
{
  "fullName": "Carlos Alberto Mendoza",
  "email": "carlos.mendoza@seguridadnorte.com",
  "role": "ADMIN",
  "clientIds": ["client_001", "client_002"],
  "isActive": true
}
```

> **CRÍTICO:** El `id` del documento DEBE ser idéntico al UID generado por Firebase Auth. Esto se maneja automáticamente en `firebaseUserService.createUser()`, pero al crear el primer usuario manualmente, debes copiar el UID de Auth y usarlo como ID del documento.

#### `forms/{formId}`

```json
{
  "name": "Control de Acceso Vehicular",
  "clientId": "client_001",
  "version": 3,
  "isActive": true,
  "fields": [
    {
      "id": "field_001",
      "type": "text",
      "label": "Placa del vehículo",
      "required": true,
      "helperText": "Ingrese la placa sin guiones",
      "validations": { "pattern": "^[A-Z]{3}[0-9]{3}$" }
    },
    {
      "id": "field_002",
      "type": "select",
      "label": "Tipo de vehículo",
      "required": true,
      "options": ["Automóvil", "Motocicleta", "Camioneta"]
    }
  ]
}
```

#### `records/{recordId}`

```json
{
  "formId": "form_001",
  "clientId": "client_001",
  "userId": "firebase_auth_uid",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "status": "PENDING",
  "answers": [
    { "fieldId": "field_001", "value": "ABC123" },
    { "fieldId": "field_002", "value": "Automóvil" }
  ],
  "evidence": {
    "photos": ["https://storage.url/photo1.jpg"],
    "signature": "data:image/png;base64,...",
    "qrValue": "AUTH-2024-001"
  },
  "observations": ""
}
```

#### `systemConfig/main`

```json
{
  "companyName": "AINCA",
  "companyLogo": "https://...",
  "primaryColor": "#1a365d",
  "secondaryColor": "#0ea5e9",
  "timezone": "America/Bogota"
}
```

---

## Autenticación (Firebase Auth)

### Método Habilitado

- **Email/Password** — Método principal para todos los usuarios.

### Flujo de Login (Producción)

```
┌─────────────────────────────┐
│  Usuario ingresa email/pass │
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────────────┐
│  Firebase Auth:                      │
│  signInWithEmailAndPassword()        │
│  → Retorna UID si credenciales OK    │
└──────────┬──────────────────────────┘
           ▼
┌─────────────────────────────────────┐
│  Firestore:                          │
│  getDoc(users/{UID})                 │
│  → Carga perfil con rol y clientIds  │
└──────────┬──────────────────────────┘
           ▼
┌─────────────────────────────────────┐
│  Validación:                         │
│  ¿isActive === true?                 │
│  SI → Sesión establecida             │
│  NO → Error: cuenta desactivada      │
└─────────────────────────────────────┘
```

### Manejo de Errores

| Código Firebase | Mensaje al Usuario |
|----------------|-------------------|
| `auth/user-not-found` | No existe una cuenta con este correo electrónico |
| `auth/wrong-password` | Contraseña incorrecta |
| `auth/invalid-email` | Correo electrónico inválido |
| `auth/user-disabled` | Tu cuenta está desactivada |
| `auth/too-many-requests` | Demasiados intentos. Intenta más tarde |
| `auth/invalid-credential` | Credenciales inválidas |

---

## Reglas de Seguridad

El archivo `firestore.rules` implementa control de acceso basado en los 5 roles del sistema.

### Funciones Auxiliares

| Función | Descripción |
|---------|-------------|
| `isAuthenticated()` | Verifica que `request.auth != null` |
| `getUserProfile()` | Carga el documento del usuario desde `users/{uid}` |
| `userRole()` | Retorna el rol del usuario autenticado |
| `isAdmin()` | `role == 'ADMIN'` |
| `isCentral()` | `role == 'CENTRAL'` |
| `isSupervisor()` | `role == 'SUPERVISOR'` |
| `isCoordinador()` | `role == 'COORDINADOR'` |
| `isCliente()` | `role == 'CLIENTE'` |
| `isActiveUser()` | `isActive == true` |
| `hasClient(clientId)` | Verifica que `clientId` esté en el array `clientIds` del usuario |

### Resumen de Reglas por Colección

#### `clients`
- **Read:** ADMIN + CENTRAL (todos) · Otros: solo si `hasClient(clientId)`
- **Create/Update:** Solo ADMIN
- **Delete:** Bloqueado (soft-delete)

#### `users`
- **Read:** ADMIN (todos) · Otros: solo su propio documento
- **Create:** Solo ADMIN
- **Update:** ADMIN (todos) · Usuarios: su propio perfil
- **Delete:** Bloqueado

#### `forms`
- **Read:** ADMIN + CENTRAL (todos) · Otros: si `hasClient(resource.data.clientId)`
- **Create/Update:** ADMIN + CENTRAL
- **Delete:** Bloqueado

#### `records`
- **Read:** ADMIN + CENTRAL (todos) · SUPERVISOR (solo `userId == auth.uid`) · COORDINADOR + CLIENTE (si `hasClient(clientId)`)
- **Create:** Solo SUPERVISOR (y `request.resource.data.userId == auth.uid`)
- **Update:** ADMIN + CENTRAL (todos) · COORDINADOR (si `hasClient(clientId)`)
- **Delete:** Bloqueado

#### `systemConfig`
- **Read:** Todos los autenticados activos
- **Write:** Solo ADMIN

### Principios de Seguridad

1. **Nunca se eliminan documentos** — Solo se desactivan (`isActive: false`)
2. **Usuarios desactivados no pueden acceder** — Se valida `isActive` en cada regla
3. **Aislamiento por cliente** — Cada usuario solo ve datos de sus `clientIds`
4. **UID sincronizado** — ID del documento de usuario = UID de Firebase Auth
5. **Regla default deniega todo** — `match /{document=**} { allow read, write: if false; }`

---

## Service Adapter — Cómo Funciona

```typescript
// src/services/serviceAdapter.ts
import { USE_FIREBASE } from "@/firebase/config";

// USE_FIREBASE se calcula así:
// export const USE_FIREBASE = firebaseConfig.apiKey !== "TU_API_KEY_AQUI";
// Como ya tiene una API key real → USE_FIREBASE = true

export const activeAuthService    = USE_FIREBASE ? firebaseAuthService    : mockAuthService;
export const activeClientService  = USE_FIREBASE ? firebaseClientService  : mockClientService;
export const activeUserService    = USE_FIREBASE ? firebaseUserService    : mockUserService;
export const activeFormService    = USE_FIREBASE ? firebaseFormService    : mockFormService;
export const activeRecordService  = USE_FIREBASE ? firebaseRecordService  : mockRecordService;
```

### ¿Cómo volver a modo mock?

Cambia el apiKey a un placeholder en `src/firebase/config.ts`:

```typescript
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",  // ← Esto desactiva Firebase
  // ...
};
```

### Archivos Clave

| Archivo | Qué hacer |
|---------|-----------|
| `src/firebase/config.ts` | ⭐ Único archivo a editar para conectar/desconectar Firebase |
| `src/services/serviceAdapter.ts` | Switch automático — no tocar |
| `firestore.rules` | Copiar a Firebase Console → Firestore → Rules |
| `src/firebase/collections.ts` | Nombres de colecciones centralizados |
| `src/firebase/converters.ts` | Type-safety automática entre TS y Firestore |

---

## Crear el Primer Usuario ADMIN

### a) Crear cuenta en Firebase Auth

1. Firebase Console → **Authentication** → **Users** → **Add user**
2. Email: `admin@tuempresa.com`
3. Password: `TuPasswordSeguro123`
4. Clic en **"Add user"**
5. **Copia el UID generado** (columna "User UID")

### b) Crear perfil en Firestore

**Primero, crear un cliente:**

1. Firebase Console → **Firestore Database** → `clients` → **Add document**
2. Dejar ID auto-generado (o escribir uno como `client_001`)
3. Campos:
   | Campo | Tipo | Valor |
   |-------|------|-------|
   | `name` | string | `"Mi Empresa S.A."` |
   | `code` | string | `"MEP-001"` |
   | `isActive` | boolean | `true` |
4. **Copia el ID del documento** creado

**Luego, crear el perfil del usuario:**

1. Firestore → `users` → **Add document**
2. **⚠️ ID del documento:** Pega el UID copiado de Firebase Auth
3. Campos:
   | Campo | Tipo | Valor |
   |-------|------|-------|
   | `fullName` | string | `"Nombre del Admin"` |
   | `email` | string | `"admin@tuempresa.com"` |
   | `role` | string | `"ADMIN"` |
   | `clientIds` | array | `[]` (vacío para admin) |
   | `isActive` | boolean | `true` |

### c) Verificar

1. Abre la aplicación → `/login`
2. Ingresa email y password del admin
3. Deberías ver el Dashboard con acceso completo

---

## Índices de Firestore

Crea los siguientes índices compuestos en Firebase Console → Firestore → **Indexes** → **Composite**:

| # | Colección | Campo 1 | Campo 2 | Descripción |
|---|-----------|---------|---------|-------------|
| 1 | `records` | `clientId` ASC | `createdAt` DESC | Registros por cliente |
| 2 | `records` | `formId` ASC | `createdAt` DESC | Registros por formulario |
| 3 | `records` | `userId` ASC | `createdAt` DESC | Registros por usuario |
| 4 | `records` | `status` ASC | `createdAt` DESC | Registros por estado |
| 5 | `users` | `clientIds` ARRAY | `fullName` ASC | Usuarios por cliente |
| 6 | `forms` | `clientId` ASC | `name` ASC | Formularios por cliente |

> **Atajo:** Firebase muestra un link en la consola del navegador cuando una consulta necesita un índice. Haz clic en el link y se creará automáticamente.

---

## Firebase CLI (Opcional)

```bash
# Instalar
npm install -g firebase-tools

# Login
firebase login

# Inicializar en el proyecto (selecciona Firestore)
firebase init firestore

# Desplegar reglas de seguridad
firebase deploy --only firestore:rules

# Desplegar índices
firebase deploy --only firestore:indexes
```

---

## Troubleshooting

### Error: "Firebase no está configurado"
- Verifica que `src/firebase/config.ts` tiene las credenciales correctas.
- Confirma que `USE_FIREBASE` es `true` en la consola del navegador.

### Error: "Perfil de usuario no encontrado"
- El UID de Firebase Auth no coincide con el ID del documento en Firestore.
- Solución: Verifica que el documento en `users/{uid}` existe con el UID correcto.

### Error: "Missing or insufficient permissions"
- Las reglas de Firestore no están publicadas o son incorrectas.
- Verifica que el campo `isActive: true` está presente en el documento del usuario.
- Verifica que el campo `role` tiene un valor válido.

### Error: "PERMISSION_DENIED" en consultas
- Puede faltar un índice compuesto. Revisa la consola del navegador para el link automático.

### La sesión se pierde al crear un usuario
- `createUserWithEmailAndPassword()` cambia el usuario autenticado actual.
- Solución temporal: re-autenticarse como admin después de crear el usuario.
- Solución ideal: usar Firebase Admin SDK desde una Cloud Function.

### No se cargan datos en el Dashboard
- `dashboardService.ts` puede estar importando servicios mock directamente.
- Verifica que las importaciones usen `serviceAdapter.ts`.

---

## Mejoras Recomendadas para Firebase

### 🔴 Prioridad Alta

1. **Migrar AuthContext a `serviceAdapter`:** El AuthContext actualmente importa `authService` (mock) directamente. Debe usar `activeAuthService` del adapter.

2. **Cloud Function para crear usuarios:** Implementar una Cloud Function que use Firebase Admin SDK para crear cuentas sin cerrar la sesión del admin.

3. **Implementar `createRecord()` en `firebaseRecordService`:** Falta el método para que supervisores creen registros desde la aplicación.

### 🟡 Prioridad Media

4. **Usar `onSnapshot` para datos en tiempo real:** Reemplazar `getDocs` con `onSnapshot` en listados para actualizaciones instantáneas.

5. **Paginación con cursores:** Implementar `limit()` + `startAfter()` para manejar grandes volúmenes de datos eficientemente.

6. **Firebase Storage para evidencias:** Configurar reglas de Storage para subida de fotos y firmas digitales.

### 🟢 Prioridad Baja

7. **Firebase Analytics:** Activar tracking de eventos para medir uso de la aplicación.

8. **Firebase Hosting:** Opcionalmente desplegar la app directamente con Firebase Hosting.

9. **Firebase App Check:** Agregar protección contra uso abusivo de la API.

---

> **🎯 Para conectar a Firebase, solo necesitas configurar UN archivo: `src/firebase/config.ts`**
> Todo lo demás se activa automáticamente gracias al Service Adapter.
