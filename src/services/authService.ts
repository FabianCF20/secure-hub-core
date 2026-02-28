import { User } from "@/models";
import { mockUsers } from "@/data/mockData";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const AUTH_STORAGE_KEY = "secureops_auth_user";

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

// Simulación de credenciales almacenadas en Firebase Auth
// En producción, esto lo manejaría Firebase Auth directamente
const mockAuthAccounts: Record<string, string> = {
  "carlos.mendoza@seguridadnorte.com": "admin123",
  "maria.vargas@seguridadnorte.com": "central123",
  "juan.rodriguez@seguridadnorte.com": "super123",
  "andrea.lopez@proteccionempresarial.com": "coord123",
  "roberto.diaz@proteccionempresarial.com": "super123",
  "laura.martinez@vigilanciametro.com": "coord123",
  "pedro.sanchez@vigilanciametro.com": "super123",
  "diana.ruiz@guardian.com": "cliente123",
};

export const authService = {
  /**
   * Simula Firebase Auth signInWithEmailAndPassword
   * Valida credenciales y retorna el perfil del usuario desde la BDD
   */
  async login(credentials: AuthCredentials): Promise<AuthResult> {
    await delay(800); // Simula latencia de red

    const { email, password } = credentials;

    // Paso 1: Validar credenciales en Firebase Auth (simulado)
    console.log(`[Auth Simulado] Intentando login para: ${email}`);
    const storedPassword = mockAuthAccounts[email];

    if (!storedPassword) {
      console.log(`[Auth Simulado] Email no encontrado en Auth`);
      return { success: false, error: "No existe una cuenta con este correo electrónico" };
    }

    if (storedPassword !== password) {
      console.log(`[Auth Simulado] Contraseña incorrecta`);
      return { success: false, error: "Contraseña incorrecta" };
    }

    // Paso 2: Obtener perfil del usuario desde la BDD (Firestore)
    console.log(`[Auth Simulado] Credenciales válidas, buscando perfil en BDD...`);
    const userProfile = mockUsers.find(u => u.email === email);

    if (!userProfile) {
      console.log(`[Auth Simulado] Perfil no encontrado en BDD`);
      return { success: false, error: "Perfil de usuario no encontrado en la base de datos" };
    }

    if (!userProfile.isActive) {
      console.log(`[Auth Simulado] Usuario desactivado`);
      return { success: false, error: "Tu cuenta está desactivada. Contacta al administrador" };
    }

    // Paso 3: Guardar sesión (simula persistencia de Firebase Auth)
    console.log(`[Auth Simulado] Login exitoso: ${userProfile.fullName} (${userProfile.role})`);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userProfile));

    return { success: true, user: userProfile };
  },

  /**
   * Simula Firebase Auth signOut
   */
  async logout(): Promise<void> {
    await delay(200);
    console.log(`[Auth Simulado] Sesión cerrada`);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  },

  /**
   * Simula Firebase Auth onAuthStateChanged
   * Recupera la sesión persistida
   */
  getStoredUser(): User | null {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as User;
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    return null;
  },

  /**
   * Registra credenciales para nuevos usuarios creados desde el panel
   */
  registerAuthAccount(email: string, password: string): void {
    mockAuthAccounts[email] = password;
    console.log(`[Auth Simulado] Cuenta registrada en Auth para: ${email}`);
  },
};
