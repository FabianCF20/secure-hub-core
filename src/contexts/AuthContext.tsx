import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User } from "@/models";
import { activeAuthService as authService, type AuthCredentials } from "@/services/serviceAdapter";
import { logError } from "@/lib/firebase-error";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: AuthCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (!isMounted) return;

        if (!firebaseUser) {
          authService.clearStoredUser();
          setUser(null);
          return;
        }

        const profile = await authService.getUserProfile(firebaseUser.uid);

        if (!isMounted) return;

        if (!profile) {
          await authService.logout();
          setUser(null);
          return;
        }

        setUser(profile);
      } catch (error) {
        logError("AuthContext.onAuthStateChanged", error);
        if (isMounted) {
          authService.clearStoredUser();
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (credentials: AuthCredentials) => {
    const result = await authService.login(credentials);
    if (result.success && result.user) {
      setUser(result.user);
      return { success: true };
    }
    return { success: false, error: result.error };
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
