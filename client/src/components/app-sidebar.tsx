import {
  LayoutDashboard,
  FileText,
  HelpCircle,
  BarChart3,
  GraduationCap,
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
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <Link href="/admin">
          <LogoSlot />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={item.testId}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
    <div className="flex items-center gap-2" data-testid="link-logo">
      <div className="relative h-10 w-10 rounded-md bg-primary text-primary-foreground overflow-hidden">
        <GraduationCap className={`absolute inset-0 m-auto h-6 w-6 ${imageLoaded ? "opacity-0" : "opacity-100"}`} />
        <img
          src="/logo.png"
          alt="Logo"
          className={`absolute inset-0 h-full w-full object-cover ${imageLoaded ? "" : "hidden"}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(false)}
        />
      </div>
      {!imageLoaded && (
        <div>
          <h1 className="text-lg font-semibold">Faith Immaculate Academy CBT</h1>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
      )}
    </div>
  );
}
