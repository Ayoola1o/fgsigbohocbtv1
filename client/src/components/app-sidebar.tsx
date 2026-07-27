import {
  LayoutDashboard,
  FileText,
  HelpCircle,
  BarChart3,
  GraduationCap,
  TrendingUp,
  Settings,
  BookOpen,
  Radio,
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
    badge: "34",
    testId: "link-exams",
  },
  {
    title: "Invigilator Hub",
    url: "/admin/invigilator",
    icon: Radio,
    badge: "45",
    testId: "link-invigilator",
  },
  {
    title: "Question Bank",
    url: "/admin/questions",
    icon: HelpCircle,
    testId: "link-questions",
  },
  {
    title: "Students",
    url: "/admin/students",
    icon: GraduationCap,
    badge: "12,300",
    testId: "link-students",
  },
  {
    title: "Results",
    url: "/admin/results",
    icon: BarChart3,
    badge: "15k+",
    testId: "link-results",
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
                          ? "bg-indigo-900 dark:bg-indigo-950 text-white shadow-md border-l-4 border-blue-500 font-bold pl-2" 
                          : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900 border-l-4 border-transparent pl-2"
                        }`}
                    >
                      <Link href={item.url} className="flex items-center gap-3 w-full justify-between">
                        <div className="flex items-center gap-3">
                          <item.icon className={`h-4.5 w-4.5 transition-transform duration-300 group-hover:scale-110 
                            ${isActive ? "text-blue-400" : "text-slate-400 group-hover:text-indigo-500"}`} 
                          />
                          <span className="tracking-tight">{item.title}</span>
                        </div>
                        {item.badge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                            isActive ? "bg-blue-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          }`}>
                            {item.badge}
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
          Fia CBT Admin
        </h1>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
          Faith Immaculate Academy
        </p>
      </div>
    </div>
  );
}
