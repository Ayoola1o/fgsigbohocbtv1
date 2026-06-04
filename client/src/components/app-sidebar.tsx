import {
  LayoutDashboard,
  FileText,
  HelpCircle,
  BarChart3,
  GraduationCap,
  TrendingUp,
  Settings,
  BookOpen,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
    testId: "link-dashboard",
  },
  {
    title: "Exams",
    url: "/admin/exams",
    icon: FileText,
    testId: "link-exams",
  },
  {
    title: "Questions",
    url: "/admin/questions",
    icon: HelpCircle,
    testId: "link-questions",
  },
  {
    title: "Results",
    url: "/admin/results",
    icon: BarChart3,
    testId: "link-results",
  },
  {
    title: "Students",
    url: "/admin/students",
    icon: GraduationCap,
    testId: "link-students",
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    icon: TrendingUp,
    testId: "link-analytics",
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
    testId: "link-settings",
  },
  {
    title: "Documentation",
    url: "/admin/documentation",
    icon: BookOpen,
    testId: "link-documentation",
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r border-slate-100 dark:border-slate-800 bg-gradient-to-b from-white via-slate-50/30 to-white dark:from-slate-950 dark:via-slate-900/30 dark:to-slate-950">
      <SidebarHeader className="p-6 border-b border-slate-50 dark:border-slate-800/50">
        <Link href="/admin">
          <LogoSlot />
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-4 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest px-2 mb-2">
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {menuItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/admin" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={item.testId}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 relative group
                        ${isActive 
                          ? "bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-sm border-l-4 border-indigo-600 dark:border-indigo-500 font-bold pl-2" 
                          : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900 border-l-4 border-transparent pl-2"
                        }`}
                    >
                      <Link href={item.url} className="flex items-center gap-3 w-full">
                        <item.icon className={`h-4.5 w-4.5 transition-transform duration-300 group-hover:scale-110 
                          ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 group-hover:text-indigo-500"}`} 
                        />
                        <span className="tracking-tight">{item.title}</span>
                        {!isActive && (
                          <span className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold">
                            View
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function LogoSlot() {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="flex items-center gap-3 group/logo cursor-pointer" data-testid="link-logo">
      <div className="relative h-11 w-11 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 text-white overflow-hidden flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover/logo:shadow-indigo-500/40 group-hover/logo:scale-105 transition-all duration-300 border border-indigo-400/20">
        <GraduationCap className={`h-6 w-6 transition-transform duration-500 group-hover/logo:rotate-12 ${imageLoaded ? "opacity-0" : "opacity-100"}`} />
        <img
          src="/logo.png"
          alt="Logo"
          className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/logo:scale-110 ${imageLoaded ? "" : "hidden"}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(false)}
        />
      </div>
      <div>
        <h1 className="text-sm font-black tracking-tight text-slate-800 dark:text-slate-100 group-hover/logo:text-indigo-600 dark:group-hover/logo:text-indigo-400 transition-colors duration-300 leading-tight">
          Faith Immaculate
        </h1>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
          CBT Admin Suite
        </p>
      </div>
    </div>
  );
}
