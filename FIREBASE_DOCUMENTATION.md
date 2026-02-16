# 🔥 SecureOps — Documentación de Integración con Firebase

## Índice

1. [Arquitectura General](#arquitectura-general)
2. [Configuración Inicial de Firebase](#configuración-inicial-de-firebase)
3. [Estructura de Firestore](#estructura-de-firestore)
4. [Autenticación (Firebase Auth)](#autenticación-firebase-auth)
5. [Reglas de Seguridad](#reglas-de-seguridad)
6. [Servicios y Adaptadores](#servicios-y-adaptadores)
7. [Migración de Mock a Firebase](#migración-de-mock-a-firebase)
8. [Índices de Firestore](#índices-de-firestore)
9. [Comandos Firebase CLI](#comandos-firebase-cli)

---

## Arquitectura General

```
┌──────────────────────────────────────────────┐
│                  FRONTEND                     │
│  React + TypeScript + Vite + Tailwind CSS     │
├──────────────────────────────────────────────┤
│             SERVICE ADAPTER LAYER             │
│  src/services/serviceAdapter.ts               │
│  (Selecciona mock o Firebase automáticamente) │
├────────────────┬─────────────────────────────┤
│  Mock Services │    Firebase Services         │
│  (Desarrollo)  │    (Producción)              │
│  In-memory     │    Firestore + Auth          │
├────────────────┴─────────────────────────────┤
│               FIREBASE SDK                    │
│  firebase/app, firebase/auth,                │
│  firebase/firestore, firebase/storage        │
├──────────────────────────────────────────────┤
│           FIREBASE BACKEND                    │
│  Authentication │ Firestore │ Storage         │
└──────────────────────────────────────────────┘
```

---

## Configuración Inicial de Firebase

### Paso 1: Crear proyecto en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Clic en **"Agregar proyecto"**
3. Nombre del proyecto: `secureops-panel` (o el que prefieras)
4. Desactiva Google Analytics (opcional para este proyecto)
5. Clic en **"Crear proyecto"**

### Paso 2: Registrar la app web

1. En la pantalla principal del proyecto, clic en el ícono **Web (</>)**
2. Nombre de la app: `SecureOps Panel`
3. **No** marques Firebase Hosting (usaremos Lovable para deploy)
4. Clic en **"Registrar app"**
5. Copia los valores del objeto `firebaseConfig`

### Paso 3: Configurar en el código

Edita el archivo `src/firebase/config.ts` y reemplaza los valores:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSy...",              // ← Tu API key
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};
```

> ⚠️ **Nota:** Estas claves son **públicas** (publishable keys). La seguridad se controla con Firebase Auth + Security Rules, no ocultando estas claves.

### Paso 4: Activar Authentication

1. En Firebase Console → **Authentication** → **Sign-in method**
2. Activa **Email/Password**
3. Guarda los cambios

### Paso 5: Crear la base de datos Firestore

1. En Firebase Console → **Firestore Database**
2. Clic en **"Crear base de datos"**
3. Selecciona modo **Producción** (las reglas de seguridad ya están preparadas)
4. Elige la ubicación más cercana a tus usuarios
5. Clic en **"Crear"**

### Paso 6: Configurar las reglas de seguridad

1. Ve a **Firestore Database → Rules**
2. Copia el contenido completo del archivo `firestore.rules`
3. Pégalo en el editor y clic en **"Publicar"**

---

## Estructura de Firestore

### Colecciones

| Colección      | Documento ID       | Descripción                      |
|---------------|-------------------|----------------------------------|
| `clients`     | Auto-generado     | Empresas cliente del sistema     |
| `users`       | Firebase Auth UID | Perfiles de usuarios             |
| `forms`       | Auto-generado     | Plantillas de formularios        |
| `records`     | Auto-generado     | Registros diligenciados          |
| `systemConfig`| `main`            | Configuración global del sistema |

### Esquema de Documentos

#### `clients/{clientId}`
```json
{
  "name": "Seguridad Integral del Norte S.A.",
  "code": "SIN-001",
  "isActive": true
}
```

#### `users/{userId}` (ID = Firebase Auth UID)
```json
{
  "fullName": "Carlos Alberto Mendoza",
  "email": "carlos.mendoza@seguridadnorte.com",
  "role": "ADMIN",
  "clientId": "client_001",
  "isActive": true
}
```

> **Importante:** El `id` del documento de usuario **debe ser igual** al UID generado por Firebase Auth. Esto se maneja automáticamente en `firebaseUserService.createUser()`.

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
    }
  ]
}
```

#### `records/{recordId}`
```json
{
  "formId": "form_001",
  "clientId": "client_001",
  "userId": "auth_uid_del_operativo",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "status": "PENDING",
  "answers": [
    { "fieldId": "field_001", "value": "ABC123" }
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
  "companyName": "SecureOps",
  "companyLogo": "https://...",
  "primaryColor": "#1a365d",
  "secondaryColor": "#0ea5e9",
  "timezone": "America/Bogota"
}
```

---

## Autenticación (Firebase Auth)

### Flujo de Login

```
Usuario ingresa email/password
        ↓
Firebase Auth: signInWithEmailAndPassword()
        ↓ (éxito → devuelve UID)
Firestore: getDoc(users/{UID})
        ↓ (carga perfil)
Valida: isActive === true
        ↓
Sesión establecida en AuthContext
```

### Flujo de Creación de Usuario (desde panel ADMIN)

```
Admin completa formulario (email, password, rol, etc.)
        ↓
Firebase Auth: createUserWithEmailAndPassword()
        ↓ (genera UID)
Firestore: setDoc(users/{UID}, perfil)
        ↓
Usuario listo para hacer login
```

### Roles del Sistema

| Rol        | Código      | Permisos                                          |
|-----------|-------------|---------------------------------------------------|
| Admin     | `ADMIN`     | CRUD total en todo el sistema                     |
| Supervisor| `SUPERVISOR`| Lectura de su cliente + aprobación de registros   |
| Operativo | `OPERATIVO` | Crear registros + ver sus propios registros       |

---

## Reglas de Seguridad

Las reglas están definidas en `firestore.rules`. Resumen de permisos:

### Matriz de Permisos

| Recurso        | ADMIN          | SUPERVISOR              | OPERATIVO               |
|---------------|----------------|-------------------------|-------------------------|
| Clientes      | Leer/Escribir  | Leer (solo su cliente)  | Leer (solo su cliente)  |
| Usuarios      | CRUD completo  | Leer (su cliente)       | Leer (solo su perfil)   |
| Formularios   | CRUD completo  | Leer+Editar (su cliente)| Leer (activos, su cliente)|
| Registros     | Leer/Aprobar   | Leer/Aprobar (su cliente)| Crear + Leer propios   |
| Config Sistema| Leer/Escribir  | Solo lectura            | Solo lectura            |

### Principios de Seguridad Aplicados

1. **Nunca se eliminan documentos** — Solo se desactivan (`isActive: false`)
2. **Usuarios desactivados no pueden acceder** — Se valida `isActive` en cada regla
3. **Aislamiento por cliente** — Cada usuario solo ve datos de su organización
4. **UID sincronizado** — El ID del documento de usuario = UID de Firebase Auth
5. **Regla default deniega todo** — Solo se permite lo explícitamente definido

---

## Servicios y Adaptadores

### Estructura de Archivos

```
src/
├── firebase/
│   ├── config.ts           ← Configuración e inicialización de Firebase
│   ├── collections.ts      ← Nombres de colecciones centralizados
│   ├── converters.ts       ← Converters tipados para Firestore
│   └── index.ts            ← Re-exports
├── services/
│   ├── authService.ts      ← Auth mock (desarrollo)
│   ├── clientService.ts    ← Clientes mock
│   ├── userService.ts      ← Usuarios mock
│   ├── formService.ts      ← Formularios mock
│   ├── recordService.ts    ← Registros mock
│   ├── dashboardService.ts ← Estadísticas
│   ├── serviceAdapter.ts   ← ⭐ Selector mock/Firebase
│   └── firebase/
│       ├── firebaseAuthService.ts
│       ├── firebaseClientService.ts
│       ├── firebaseUserService.ts
│       ├── firebaseFormService.ts
│       ├── firebaseRecordService.ts
│       └── index.ts
```

### Cómo funciona el Adapter

```typescript
// src/services/serviceAdapter.ts
import { USE_FIREBASE } from "@/firebase/config";

export const activeAuthService = USE_FIREBASE 
  ? firebaseAuthService   // ← Producción
  : mockAuthService;      // ← Desarrollo
```

**Cuando configures Firebase en `config.ts`, toda la app cambiará automáticamente a usar Firestore.** No necesitas modificar ningún otro archivo.

---

## Migración de Mock a Firebase

### Pasos para activar Firebase

1. ✅ Configurar `firebaseConfig` en `src/firebase/config.ts`
2. ✅ Activar Email/Password en Firebase Auth
3. ✅ Crear base de datos Firestore
4. ✅ Copiar las reglas de seguridad desde `firestore.rules`
5. ✅ Crear el primer usuario ADMIN manualmente:

#### Crear usuario ADMIN inicial

Desde Firebase Console:

**a) Crear cuenta en Authentication:**
- Ve a Authentication → Users → Add user
- Email: `admin@tuempresa.com`
- Password: `TuPasswordSeguro123`
- Copia el **UID** generado

**b) Crear perfil en Firestore:**
- Ve a Firestore → clients → Agregar documento
  - ID: (auto-generado, copia el ID)
  - Campos: `name`, `code`, `isActive: true`
  
- Ve a Firestore → users → Agregar documento
  - **ID del documento: pega el UID de Auth** ← ¡IMPORTANTE!
  - Campos:
    ```
    fullName: "Nombre del Admin"
    email: "admin@tuempresa.com"
    role: "ADMIN"
    clientId: "(ID del cliente creado arriba)"
    isActive: true
    ```

6. ✅ Inicia sesión con las credenciales del ADMIN
7. ✅ Desde el panel, crea más usuarios, clientes y formularios

### Datos de prueba

Si quieres cargar los datos mock en Firestore, puedes usar el script de la consola del navegador o Firebase CLI con datos exportados.

---

## Índices de Firestore

Firebase creará índices automáticamente para consultas simples. Para consultas compuestas, necesitarás crear los siguientes índices en Firebase Console → Firestore → **Indexes**:

| Colección | Campos                          | Tipo de consulta  |
|----------|--------------------------------|-------------------|
| `records`| `clientId` ASC, `createdAt` DESC | Filtrar por cliente |
| `records`| `formId` ASC, `createdAt` DESC   | Filtrar por formulario |
| `records`| `userId` ASC, `createdAt` DESC   | Filtrar por usuario |
| `records`| `status` ASC, `createdAt` DESC   | Filtrar por estado |
| `users`  | `clientId` ASC, `fullName` ASC   | Usuarios por cliente |
| `forms`  | `clientId` ASC, `name` ASC       | Formularios por cliente |

> **Tip:** Firebase te mostrará un enlace en la consola del navegador cuando una consulta necesite un índice. Solo haz clic en el enlace para crearlo automáticamente.

---

## Comandos Firebase CLI (Opcional)

Si prefieres usar Firebase CLI para gestionar las reglas:

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar proyecto (selecciona Firestore)
firebase init firestore

# Desplegar reglas de seguridad
firebase deploy --only firestore:rules

# Desplegar índices
firebase deploy --only firestore:indexes
```

---

## Resumen de Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `src/firebase/config.ts` | ⭐ Configuración Firebase (editar aquí para conectar) |
| `src/services/serviceAdapter.ts` | ⭐ Switch automático mock/Firebase |
| `firestore.rules` | ⭐ Reglas de seguridad (copiar a Firebase Console) |
| `src/services/firebase/*.ts` | Servicios de Firestore |
| `src/firebase/converters.ts` | Type-safety para Firestore |
| `src/firebase/collections.ts` | Nombres de colecciones |

---

> **🎯 Para conectar a Firebase, solo necesitas editar UN archivo: `src/firebase/config.ts`**
> Todo lo demás se activa automáticamente.
