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

  // Authentication check enabled for secure hardcoded access
  useEffect(() => {
    const userStr = localStorage.getItem("admin_user");
    if (!userStr) {
      setLocation("/admin/login");
    }
  }, [setLocation]);

  async function handleLogout() {
    try {
      setIsLoggingOut(true);
      await apiRequest("POST", "/api/admin/logout").catch(() => {});
      localStorage.removeItem("admin_user");
      toast({ title: "Logged out", description: "You have been logged out." });
      setLocation("/admin/login");
    } catch (err) {
      console.error(err);
      toast({ title: "Logout failed", description: "Please try again." });
    } finally {
      setIsLoggingOut(false);
    }
  }

  // Generate breadcrumb components based on location path
  const pathParts = location.split("/").filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => {
    const isLast = index === pathParts.length - 1;
    const readable = part.charAt(0).toUpperCase() + part.slice(1);
    return (
      <div key={part} className="flex items-center gap-1.5 text-xs">
        {index > 0 && <span className="text-slate-300 dark:text-slate-700 font-normal">/</span>}
        <span className={`font-bold transition-colors ${isLast ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : "text-slate-400 dark:text-slate-500"}`}>
          {readable === "Admin" ? "Dashboard" : readable}
        </span>
      </div>
    );
  });

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-16 items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md px-6 shrink-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger 
                data-testid="button-sidebar-toggle" 
                className="h-9 w-9 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors border border-slate-100 dark:border-slate-800"
              />
              <div className="hidden md:flex items-center gap-1.5 bg-slate-100/50 dark:bg-slate-950/40 px-3 py-1.5 rounded-full border border-slate-200/30 dark:border-slate-800/30">
                {breadcrumbs.length > 0 ? breadcrumbs : (
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-extrabold">Dashboard</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 group cursor-pointer">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-black shadow-md shadow-indigo-500/10 border border-white/20">
                    AD
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-black text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-none">Admin Administrator</p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5 leading-none">Active Session</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleLogout} 
                  disabled={isLoggingOut}
                  className="h-8 px-3 text-xs font-bold border-rose-200/50 dark:border-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all rounded-lg"
                >
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6 md:p-8 animate-fade-in-up bg-slate-50/20 dark:bg-slate-950/20">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
