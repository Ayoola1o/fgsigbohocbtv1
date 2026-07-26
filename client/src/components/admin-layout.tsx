import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Search, Bell, Shield, User, Settings, LogOut, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  // Authentication check
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

  // Generate page title from current location
  const pathParts = location.split("/").filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1] || "admin";
  const pageTitle = lastPart === "admin" ? "Dashboard Overview" 
    : lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, " ") + " Overview";

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header Topbar with Search Bar, Notifications, Theme Toggle, Admin Profile */}
          <header className="flex h-14 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 shrink-0 z-10 gap-4">
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger 
                data-testid="button-sidebar-toggle" 
                className="h-8 w-8 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors shrink-0"
              />
              <h1 className="text-sm font-bold text-slate-800 dark:text-slate-200 hidden md:block">
                {pageTitle}
              </h1>

              {/* Global Search Bar */}
              <div className="relative max-w-xs w-full hidden sm:block ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="pl-9 pr-3 h-8 bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus-visible:ring-1 focus-visible:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Notification Bell with green count badge */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40">
                    <Bell className="h-4 w-4" />
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 text-white text-[8px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900">2</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 rounded-2xl border-slate-100 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">Notifications Center</h4>
                    <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 font-extrabold text-[10px]">2 New</Badge>
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-slate-800/40 max-h-72 overflow-y-auto">
                    <div className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-colors flex gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">WAEC-BIO-1 Session Live</p>
                        <p className="text-[11px] text-slate-400 font-medium">124 candidates currently taking exam</p>
                        <span className="text-[9px] text-indigo-500 font-bold mt-1 block">2 mins ago</span>
                      </div>
                    </div>
                    <div className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-colors flex gap-3">
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Center 03 flagged issue</p>
                        <p className="text-[11px] text-slate-400 font-medium">Network connectivity alert</p>
                        <span className="text-[9px] text-slate-400 font-bold mt-1 block">25 mins ago</span>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <ThemeToggle />

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

              {/* Admin Profile: "Admin: Sarah Johnson" with avatar */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer group p-1 pr-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="hidden sm:block text-right">
                      <p className="text-[10px] text-slate-400 font-medium leading-tight">Admin:</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                        Sarah Johnson
                      </p>
                    </div>
                    <div className="relative">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center text-white text-[10px] font-black shadow-md border-2 border-white dark:border-slate-800">
                        SJ
                      </div>
                      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1.5 ring-white dark:ring-slate-900" />
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-slate-100 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900">
                  <DropdownMenuLabel className="font-normal p-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200">Sarah Johnson</p>
                      <p className="text-[11px] text-slate-400 font-medium">sarah.johnson@faithimmaculate.edu.ng</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2 text-xs font-semibold">
                    <Link href="/admin/settings" className="flex items-center gap-2 w-full">
                      <Settings className="h-4 w-4 text-slate-500" />
                      <span>System Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2 text-xs font-semibold">
                    <Link href="/admin/documentation" className="flex items-center gap-2 w-full">
                      <Shield className="h-4 w-4 text-slate-500" />
                      <span>Security & Roles</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="rounded-xl cursor-pointer py-2 text-xs font-bold text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/20"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>{isLoggingOut ? "Logging out..." : "Log Out"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
