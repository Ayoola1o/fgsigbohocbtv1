import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Authentication check removed to allow direct access
  /*
  useEffect(() => {
    const userStr = localStorage.getItem("admin_user");
    if (!userStr) {
      setLocation("/admin/login");
    }
  }, [setLocation]);
  */

  async function handleLogout() {
    try {
      setIsLoggingOut(true);
      await apiRequest("POST", "/api/admin/logout");
      toast({ title: "Logged out", description: "You have been logged out." });
      setLocation("/");
    } catch (err) {
      console.error(err);
      toast({ title: "Logout failed", description: "Please try again." });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button size="sm" variant="ghost" onClick={handleLogout} disabled={isLoggingOut}>
                {isLoggingOut ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
