import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { MobileSidebar } from "./MobileSidebar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      {!isMobile && (
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      )}

      {/* Mobile sidebar drawer */}
      {isMobile && (
        <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />
      )}

      <Topbar
        sidebarCollapsed={isMobile ? true : sidebarCollapsed}
        onMobileMenuToggle={() => setMobileOpen(true)}
        isMobile={isMobile}
      />

      <main
        className={cn(
          "min-h-screen pt-16 transition-all duration-300",
          isMobile ? "pl-0" : sidebarCollapsed ? "pl-16" : "pl-64"
        )}
      >
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
