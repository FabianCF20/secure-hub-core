import { Search, LogOut, User as UserIcon, Settings, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";

interface TopbarProps {
  sidebarCollapsed: boolean;
  onMobileMenuToggle?: () => void;
  isMobile?: boolean;
}

const roleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  CENTRAL: "Central",
  SUPERVISOR: "Supervisor",
  COORDINADOR: "Coordinador",
  CLIENTE: "Cliente",
};

export function Topbar({ sidebarCollapsed, onMobileMenuToggle, isMobile }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 border-b border-border bg-card transition-all duration-300 ${
        isMobile ? "left-0" : sidebarCollapsed ? "left-16" : "left-64"
      }`}
    >
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={onMobileMenuToggle}>
              <Menu className="h-5 w-5" />
            </Button>
          )}

          <div className="relative hidden sm:block w-64 md:w-80 lg:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" placeholder="Buscar..." className="pl-10 bg-background" />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" className="sm:hidden">
            <Search className="h-5 w-5" />
          </Button>

          {/* Real-time Notifications */}
          <NotificationPanel />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">{user?.fullName || "Usuario"}</p>
                  <p className="text-xs text-muted-foreground">
                    {user ? roleLabels[user.role] || user.role : "—"}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserIcon className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Preferencias
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
