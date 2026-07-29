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
import { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  getAdminProfile,
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from "@/lib/firebase-api";
import type { AdminUser, AppNotification } from "@shared/schema";
import {
  Search,
  Bell,
  Shield,
  User,
  Settings,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Info,
  CheckCheck
} from "lucide-react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Authentication check
  useEffect(() => {
    const userStr = localStorage.getItem("admin_user");
    if (!userStr) {
      setLocation("/admin/login");
    }
  }, [setLocation]);

  // Fetch Logged In Admin Profile
  const { data: adminProfile } = useQuery<AdminUser | null>({
    queryKey: ["adminProfile"],
    queryFn: () => getAdminProfile("default-admin"),
  });

  // Subscribe to real-time notifications
  useEffect(() => {
    const unsubscribe = subscribeToNotifications((list) => {
      setNotifications(list);
    });
    return () => unsubscribe();
  }, []);

  // Filter notifications based on admin preferences (urgent cheating alerts ALWAYS pass through)
  const filteredNotifications = useMemo(() => {
    const prefs = adminProfile?.notificationPreferences;
    return notifications.filter((notif) => {
      // Cheating & urgent alerts can NEVER be opted out of
      if (notif.category === "cheating" || notif.severity === "urgent") return true;
      if (!prefs) return true;
      if (notif.category === "results" && prefs.results === false) return false;
      if (notif.category === "questions" && prefs.questions === false) return false;
      if (notif.category === "messages" && prefs.messages === false) return false;
      if (notif.category === "exams" && prefs.exams === false) return false;
      if (notif.category === "system" && prefs.system === false) return false;
      return true;
    });
  }, [notifications, adminProfile]);

  const unreadCount = useMemo(() => {
    return filteredNotifications.filter((n) => !n.isRead).length;
  }, [filteredNotifications]);

  // Urgent Cheating Alert Check (triggers top banner toast)
  const activeUrgentAlert = useMemo(() => {
    return notifications.find((n) => !n.isRead && (n.severity === "urgent" || n.category === "cheating"));
  }, [notifications]);

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

  const handleNotificationItemClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id);
    }
    if (notif.deepLink) {
      setLocation(notif.deepLink);
    }
  };

  const adminName = adminProfile?.name || "Sarah Johnson";
  const adminEmail = adminProfile?.email || "sarah.johnson@faithimmaculate.edu.ng";
  const getInitials = (nameStr: string) => {
    const parts = nameStr.split(" ");
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : nameStr.slice(0, 2).toUpperCase();
  };

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
          {/* Persistent High-Priority Urgent Cheating Alert Banner */}
          {activeUrgentAlert && (
            <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white px-6 py-2.5 flex items-center justify-between shadow-lg z-20 animate-pulse">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <div>
                  <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full mr-2">
                    URGENT CHEATING ALERT
                  </span>
                  <span className="text-xs font-bold">{activeUrgentAlert.title}: {activeUrgentAlert.message}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleNotificationItemClick(activeUrgentAlert)}
                  className="bg-white text-rose-700 hover:bg-rose-50 text-xs font-black rounded-lg h-7 px-3 gap-1 shadow"
                >
                  Investigate Live
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

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
              {/* Dynamic Real-time Notification Bell Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-88 p-0 rounded-2xl border-slate-100 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">Notifications Center</h4>
                    {unreadCount > 0 ? (
                      <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-extrabold text-[10px]">
                        {unreadCount} Unread
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-extrabold text-[10px]">
                        All Read
                      </Badge>
                    )}
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-slate-800/40 max-h-80 overflow-y-auto">
                    {filteredNotifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 font-medium">
                        No notifications to display.
                      </div>
                    ) : (
                      filteredNotifications.slice(0, 5).map((notif) => {
                        const isUrgent = notif.severity === "urgent" || notif.category === "cheating";
                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationItemClick(notif)}
                            className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-colors flex gap-3 cursor-pointer ${
                              !notif.isRead ? (isUrgent ? "bg-rose-50/50 dark:bg-rose-950/20" : "bg-indigo-50/30 dark:bg-indigo-950/10") : ""
                            }`}
                          >
                            {isUrgent ? (
                              <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                            ) : notif.severity === "important" ? (
                              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className={`text-xs font-extrabold truncate ${isUrgent ? "text-rose-950 dark:text-rose-200" : "text-slate-800 dark:text-slate-200"}`}>
                                  {notif.title}
                                </p>
                                {!notif.isRead && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 font-medium line-clamp-2 mt-0.5">
                                {notif.message}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 rounded-b-2xl text-center">
                    <Link
                      href="/admin/notifications"
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1"
                    >
                      View All Notifications
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </PopoverContent>
              </Popover>

              <ThemeToggle />

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

              {/* Admin Profile: Dynamic Admin Name & Avatar linking to /admin/profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer group p-1 pr-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="hidden sm:block text-right">
                      <p className="text-[10px] text-slate-400 font-medium leading-tight">Admin:</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                        {adminName}
                      </p>
                    </div>
                    <div className="relative">
                      {adminProfile?.avatarUrl ? (
                        <img
                          src={adminProfile.avatarUrl}
                          alt={adminName}
                          className="h-8 w-8 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center text-white text-[10px] font-black shadow-md border-2 border-white dark:border-slate-800">
                          {getInitials(adminName)}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1.5 ring-white dark:ring-slate-900" />
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-slate-100 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900">
                  <DropdownMenuLabel className="font-normal p-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200">{adminName}</p>
                      <p className="text-[11px] text-slate-400 font-medium truncate">{adminEmail}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2 text-xs font-semibold">
                    <Link href="/admin/profile" className="flex items-center gap-2 w-full">
                      <User className="h-4 w-4 text-indigo-600" />
                      <span>Admin Personal Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2 text-xs font-semibold">
                    <Link href="/admin/notifications" className="flex items-center gap-2 w-full">
                      <Bell className="h-4 w-4 text-slate-500" />
                      <span>Notification Center</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2 text-xs font-semibold">
                    <Link href="/admin/settings" className="flex items-center gap-2 w-full">
                      <Settings className="h-4 w-4 text-slate-500" />
                      <span>School System Settings</span>
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
