import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  getAppNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToNotifications
} from "@/lib/firebase-api";
import type { AppNotification } from "@shared/schema";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldAlert,
  BookOpen,
  MessageSquare,
  FileCheck,
  Calendar,
  Filter,
  CheckCheck,
  ArrowRight,
  Sparkles,
  Search
} from "lucide-react";

export default function AdminNotificationsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Live real-time subscription
  useEffect(() => {
    const unsubscribe = subscribeToNotifications((list) => {
      setNotifications(list);
    });
    return () => unsubscribe();
  }, []);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appNotifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => {
      toast({
        title: "Notifications Cleared",
        description: "All notifications marked as read.",
      });
      queryClient.invalidateQueries({ queryKey: ["appNotifications"] });
    },
  });

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (categoryFilter !== "all" && notif.category !== categoryFilter) return false;
      if (severityFilter !== "all" && notif.severity !== severityFilter) return false;
      if (statusFilter === "unread" && notif.isRead) return false;
      if (statusFilter === "read" && !notif.isRead) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = notif.title.toLowerCase().includes(term);
        const matchesMsg = notif.message.toLowerCase().includes(term);
        if (!matchesTitle && !matchesMsg) return false;
      }
      return true;
    });
  }, [notifications, categoryFilter, severityFilter, statusFilter, searchTerm]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.deepLink) {
      setLocation(notif.deepLink);
    }
  };

  const getCategoryIcon = (category: string, severity: string) => {
    if (severity === "urgent" || category === "cheating") {
      return <ShieldAlert className="h-5 w-5 text-rose-600" />;
    }
    switch (category) {
      case "results":
        return <FileCheck className="h-5 w-5 text-emerald-600" />;
      case "questions":
        return <BookOpen className="h-5 w-5 text-indigo-600" />;
      case "messages":
        return <MessageSquare className="h-5 w-5 text-amber-600" />;
      case "exams":
        return <Calendar className="h-5 w-5 text-purple-600" />;
      default:
        return <Info className="h-5 w-5 text-slate-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "urgent":
        return <Badge className="bg-rose-600 text-white font-black text-[9px] uppercase tracking-wider animate-pulse">Urgent</Badge>;
      case "important":
        return <Badge className="bg-amber-500 text-white font-extrabold text-[9px] uppercase tracking-wider">Important</Badge>;
      default:
        return <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-[9px] uppercase">Info</Badge>;
    }
  };

  const formatRelativeTime = (dateInput: any) => {
    if (!dateInput) return "Recently";
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const diffSeconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (diffSeconds < 60) return "Just now";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl pb-16 font-sans">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Sparkles className="h-44 w-44 text-white" />
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="h-14 w-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
            <Bell className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Notification Center</h1>
              {unreadCount > 0 && (
                <Badge className="bg-rose-500 text-white font-black text-xs px-2.5 py-0.5 rounded-full">
                  {unreadCount} Unread
                </Badge>
              )}
            </div>
            <p className="text-xs text-indigo-200 font-medium mt-1">
              Real-time audit log of system events, integrity alerts, result releases, and messages.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Button
            onClick={() => markAllReadMutation.mutate()}
            disabled={unreadCount === 0 || markAllReadMutation.isPending}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs rounded-xl h-10 px-4 gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Mark All as Read
          </Button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <Card className="border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-36 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="urgent">Urgent Only</SelectItem>
                  <SelectItem value="important">Important Only</SelectItem>
                  <SelectItem value="info">Info Only</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unread">Unread Only</SelectItem>
                  <SelectItem value="read">Read Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {[
              { id: "all", label: "All Categories" },
              { id: "cheating", label: "Integrity Alerts" },
              { id: "results", label: "Results & Scores" },
              { id: "questions", label: "Question Bank" },
              { id: "messages", label: "Messages" },
              { id: "exams", label: "Exams" },
            ].map((cat) => (
              <Button
                key={cat.id}
                variant={categoryFilter === cat.id ? "default" : "outline"}
                onClick={() => setCategoryFilter(cat.id)}
                className={`h-8 rounded-xl text-xs font-bold px-3 ${
                  categoryFilter === cat.id
                    ? "bg-indigo-600 text-white"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center">
            <div className="h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-200">No Notifications Found</h3>
            <p className="text-xs text-slate-400 mt-1">You are all caught up! No notifications match your selected filters.</p>
          </Card>
        ) : (
          filteredNotifications.map((notif) => {
            const isUrgent = notif.severity === "urgent" || notif.category === "cheating";
            return (
              <Card
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`rounded-2xl transition-all cursor-pointer border ${
                  isUrgent
                    ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/60 shadow-md"
                    : notif.isRead
                    ? "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
                    : "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 shadow-sm"
                } hover:shadow-lg`}
              >
                <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-2xl shrink-0 ${
                      isUrgent ? "bg-rose-100 text-rose-600 dark:bg-rose-900/40" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}>
                      {getCategoryIcon(notif.category, notif.severity)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-sm font-black ${isUrgent ? "text-rose-950 dark:text-rose-200" : "text-slate-850 dark:text-slate-100"}`}>
                          {notif.title}
                        </h4>
                        {getSeverityBadge(notif.severity)}
                        {!notif.isRead && (
                          <span className="h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono pt-1">
                        <span>{formatRelativeTime(notif.createdAt)}</span>
                        <span>•</span>
                        <span className="capitalize">{notif.category}</span>
                      </div>
                    </div>
                  </div>

                  {notif.deepLink && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 shrink-0 gap-1.5"
                    >
                      View
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
