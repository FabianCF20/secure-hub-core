import { UserRole } from "@/models";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  ClipboardList,
  BarChart3,
  Settings,
  BookOpen,\n  ShieldCheck,
} from "lucide-react";

export interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  allowedRoles: UserRole[];
}

// Definición centralizada de navegación con permisos por rol
export const navItems: NavItem[] = [
  {
    to: "/",
    icon: LayoutDashboard,
    label: "Dashboard",
    allowedRoles: ["ADMIN", "CENTRAL", "SUPERVISOR", "COORDINADOR", "CLIENTE", "GUARDA"],
  },
  {
    to: "/clients",
    icon: Building2,
    label: "Clientes",
    allowedRoles: ["ADMIN"],
  },
  {
    to: "/users",
    icon: Users,
    label: "Usuarios",
    allowedRoles: ["ADMIN"],
  },
  {
    to: "/forms",
    icon: FileText,
    label: "Formularios",
    allowedRoles: ["ADMIN", "CENTRAL", "SUPERVISOR", "COORDINADOR", "CLIENTE", "GUARDA"],
  },
  {
    to: "/records",
    icon: ClipboardList,
    label: "Registros",
    allowedRoles: ["ADMIN", "CENTRAL", "SUPERVISOR", "COORDINADOR", "CLIENTE", "GUARDA"],
  },
  {
    to: "/minuta",
    icon: BookOpen,
    label: "Minuta",
    allowedRoles: ["ADMIN", "CENTRAL", "SUPERVISOR", "COORDINADOR", "GUARDA"],
  },
  {
    to: "/reports",
    icon: BarChart3,
    label: "Reportes",
    allowedRoles: ["ADMIN", "CENTRAL", "COORDINADOR"],
  },
  {
    to: "/settings",
    icon: Settings,
    label: "Configuración",
    allowedRoles: ["ADMIN"],
  },
];

export function getNavItemsForRole(role: UserRole | undefined): NavItem[] {
  if (!role) return [];
  return navItems.filter((item) => item.allowedRoles.includes(role)).map((item) =>\n    item.to === "/intelligence" && !["ADMIN", "CENTRAL"].includes(role)\n      ? { ...item, label: "Reportar observación" }\n      : item\n  );
}
