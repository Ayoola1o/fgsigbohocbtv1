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
  User,
  Bell
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { SystemSettings } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
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
    title: "Invigilator Hub",
    url: "/admin/invigilator",
    icon: Radio,
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
    testId: "link-students",
  },
  {
    title: "Results",
    url: "/admin/results",
    icon: BarChart3,
    testId: "link-results",
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    icon: TrendingUp,
    testId: "link-analytics",
  },
  {
    title: "Notifications",
    url: "/admin/notifications",
    icon: Bell,
    testId: "link-notifications",
  },
  {
    title: "Admin Profile",
    url: "/admin/profile",
    icon: User,
    testId: "link-profile",
  },
  {
    title: "School Settings",
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
  const { data: settings } = useQuery<SystemSettings>({ queryKey: ['/api/settings'] });

  return (
    <Sidebar className="border-r border-blue-950">
      <SidebarHeader className="border-b border-white/10 bg-[#061333] p-6">
        <Link href="/admin">
          <LogoSlot name={settings?.schoolName} logo={settings?.schoolLogo} />
        </Link>
      </SidebarHeader>
      <SidebarContent className="bg-[#061333] px-4 py-4">
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
                          ? "!bg-gradient-to-r from-blue-600 to-blue-800 !text-white shadow-md font-bold"
                          : "!text-blue-100 hover:!bg-white/10 hover:!text-white"
                        }`}
                    >
                      <Link href={item.url} className="flex items-center gap-3 w-full justify-between">
                        <div className="flex items-center gap-3">
                          <item.icon className={`h-4.5 w-4.5 transition-transform duration-300 group-hover:scale-110
                            ${isActive ? "text-white" : "text-blue-200/75"}`}
                          />
                          <span className="tracking-tight">{item.title}</span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-auto rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-950 to-blue-800/60 p-4 text-center text-white">
          <GraduationCap className="mx-auto mb-2 size-7 text-blue-200" />
          <p className="text-sm font-bold">Academic excellence</p>
          <p className="mt-1 text-xs text-blue-100">Building a smarter future together</p>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

function LogoSlot({ name, logo }: { name?: string; logo?: string }) {
  return (
    <div className="flex items-center gap-3" data-testid="link-logo">
      <img src={logo || "/logo.png"} alt="" className="size-12 shrink-0 object-contain" />
      <div>
        <p className="text-sm font-bold leading-tight text-white">{name || "Faith Immaculate Academy"}</p>
        <p className="mt-1 text-xs text-blue-200">CBT Administration</p>
      </div>
    </div>
  );
}
