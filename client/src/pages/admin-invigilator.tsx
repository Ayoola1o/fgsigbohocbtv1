import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Clock,
  UserCheck,
  Search,
  CheckCircle,
  Play,
  Send,
  PlusCircle,
  RefreshCw,
  Radio,
  Trash2,
  AlertTriangle,
  Calendar,
  AlertOctagon,
  Hourglass,
  Megaphone,
  MessageSquare,
  Download,
  Wifi,
  WifiOff,
  ShieldAlert,
  MoreVertical,
  Flag,
  User,
  Users,
  Sparkles
} from "lucide-react";
import { getDocs, collection, updateDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  submitExamSession,
  deleteExamSession,
  updateSessionExtraTime,
  sendStudentMessage,
  broadcastInvigilatorMessage
} from "@/lib/firebase-api";
import type { ExamSession, Exam } from "@shared/schema";

interface InvigilatorSession extends ExamSession {
  examTitle?: string;
  examDuration?: number;
  totalQuestionsCount?: number;
}

const safeParseDate = (val: any): Date | null => {
  if (!val) return null;
  if (typeof val === "object" && typeof val.toDate === "function") {
    return val.toDate();
  }
  if (typeof val === "object" && typeof val.seconds === "number") {
    return new Date(val.seconds * 1000);
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const formatDurationHMS = (ms: number): string => {
  if (ms <= 0 || isNaN(ms)) return "00m 00s";
  const totalSecs = Math.floor(ms / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hours > 0) {
    return `${hours}h ${pad(mins)}m ${pad(secs)}s`;
  }
  return `${pad(mins)}m ${pad(secs)}s`;
};

const getInitials = (name?: string): string => {
  if (!name) return "ST";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export default function AdminInvigilatorPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [examFilter, setExamFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("today"); // default to Today
  const [isLiveSyncEnabled, setIsLiveSyncEnabled] = useState<boolean>(false); // Default OFF to save quota!
  const [extraTimeMinutes, setExtraTimeMinutes] = useState<number>(5);
  const [selectedSessionForAction, setSelectedSessionForAction] = useState<InvigilatorSession | null>(null);
  const [actionType, setActionType] = useState<"addTime" | "forceSubmit" | "deleteSession" | "purgeCompleted" | "purgeExpired" | "forceSubmitAll" | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Multi-Select Checkbox State for Candidates Table
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"students" | "qa">("students");

  // Broadcast & Messaging State
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastMessageText, setBroadcastMessageText] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const [isDirectMsgModalOpen, setIsDirectMsgModalOpen] = useState(false);
  const [directMsgText, setDirectMsgText] = useState("");
  const [selectedStudentForMsg, setSelectedStudentForMsg] = useState<InvigilatorSession | null>(null);
  const [isSendingDirect, setIsSendingDirect] = useState(false);

  // Connection Status Evaluator
  const getConnectionInfo = (s: InvigilatorSession, currentTime: number) => {
    if (s.isCompleted) {
      return { status: "submitted", label: "Submitted", color: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200", icon: CheckCircle };
    }
    const lastSeen = safeParseDate(s.lastSeenAt);
    if (!lastSeen) {
      return { status: "idle", label: "Not Started / Idle", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200", icon: Clock };
    }

    const diffSecs = Math.max(0, Math.floor((currentTime - lastSeen.getTime()) / 1000));

    if (diffSecs <= 25) {
      return { status: "online", label: `Online (${diffSecs}s ago)`, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200", icon: Wifi };
    } else if (diffSecs <= 60) {
      return { status: "unstable", label: `Connection Lost (${diffSecs}s ago)`, color: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200", icon: AlertTriangle };
    } else {
      const mins = Math.floor(diffSecs / 60);
      return { status: "offline", label: `Offline (${mins}m ago)`, color: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200", icon: WifiOff };
    }
  };

  // CSV Export Session Log
  const handleExportSessionLog = () => {
    if (!enrichedSessions || enrichedSessions.length === 0) {
      toast({ title: "Export Warning", description: "No session records available to export." });
      return;
    }

    const headers = [
      "Student ID",
      "Candidate Name",
      "Examination",
      "Status",
      "Connection State",
      "Tab Switch Flags",
      "Questions Answered",
      "Time Started",
      "Last Heartbeat"
    ];

    const rows = enrichedSessions.map(s => {
      const conn = getConnectionInfo(s, Date.now());
      const answeredCount = s.answers ? Object.keys(s.answers).length : 0;
      const totalQ = s.totalQuestionsCount || 0;
      const lastSeen = safeParseDate(s.lastSeenAt);

      return [
        `"${s.studentId}"`,
        `"${s.studentName}"`,
        `"${s.examTitle || 'Exam'}"`,
        s.isCompleted ? "COMPLETED" : "IN_PROGRESS",
        `"${conn.label}"`,
        s.tabSwitches || 0,
        `"${answeredCount}/${totalQ}"`,
        `"${s.parsedStart ? s.parsedStart.toLocaleTimeString() : '-'}"`,
        `"${lastSeen ? lastSeen.toLocaleTimeString() : '-'}"`
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `invigilator_session_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Export Successful", description: `Exported ${enrichedSessions.length} session audit log entries to CSV.` });
  };

  // 1-second live ticker for real-time exam duration tracking
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = new Date().toDateString();

  // Fetch active exam sessions (only today's by default, or all if selected)
  const { data: sessions = [], isLoading, refetch } = useQuery<InvigilatorSession[]>({
    queryKey: ["invigilatorExamSessions", dateFilter],
    queryFn: async () => {
      let q;
      if (dateFilter === "today") {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        q = query(collection(db, "exam_sessions"), where("startedAt", ">=", todayStart));
      } else {
        q = collection(db, "exam_sessions");
      }
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as InvigilatorSession);
      return list;
    },
    refetchInterval: isLiveSyncEnabled ? 15000 : false,
  });


  // Fetch exams lookup
  const { data: exams = [] } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, "exams"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Exam);
    },
  });

  const examMap = useMemo(() => new Map(exams.map(e => [e.id, e])), [exams]);

  // Enrich sessions with exam metadata and parsed dates
  const enrichedSessions = useMemo(() => {
    return sessions.map(s => {
      const ex = examMap.get(s.examId);
      const totalCount = s.sessionQuestionIds?.length || ex?.questionIds?.length || 0;
      const parsedStart = safeParseDate(s.startedAt);
      const parsedEnd = safeParseDate(s.endedAt);
      const isToday = parsedStart ? parsedStart.toDateString() === todayStr : false;
      const elapsedMinutes = parsedStart ? Math.max(0, Math.floor((Date.now() - parsedStart.getTime()) / (1000 * 60))) : 0;
      const isExpiredStale = Boolean(!s.isCompleted && (!isToday || (ex?.duration ? elapsedMinutes > (ex.duration + 30) : elapsedMinutes > 180)));

      return {
        ...s,
        examTitle: ex?.title || "Examination",
        examDuration: ex?.duration || 60,
        totalQuestionsCount: totalCount,
        parsedStart,
        parsedEnd,
        isToday,
        elapsedMinutes,
        isExpiredStale,
      };
    });
  }, [sessions, examMap, todayStr]);

  // Candidate Row Status Evaluator for Mockup Aesthetics
  const getCandidateRowStatus = (s: InvigilatorSession, currentTime: number) => {
    if (s.isCompleted) {
      return {
        key: "submitted",
        label: "Submitted",
        badgeClass: "text-slate-400 font-bold flex items-center gap-1.5",
        dotClass: "h-2 w-2 rounded-full bg-slate-400",
        avatarBg: "bg-slate-800/80 text-slate-300 border border-slate-700/60",
        progressColor: "bg-slate-600",
        isStale: false,
      };
    }

    if (s.tabSwitches && s.tabSwitches > 0) {
      return {
        key: "tab_switch",
        label: "Tab switch",
        badgeClass: "text-rose-400 font-bold flex items-center gap-1.5",
        icon: Flag,
        avatarBg: "bg-rose-950/80 text-rose-300 border border-rose-800/60",
        progressColor: "bg-rose-500",
        isStale: false,
      };
    }

    const lastSeen = safeParseDate(s.lastSeenAt);
    if (!lastSeen) {
      return {
        key: "in_progress",
        label: "In progress",
        badgeClass: "text-emerald-400 font-bold flex items-center gap-1.5",
        dotClass: "h-2 w-2 rounded-full bg-emerald-400 animate-pulse",
        avatarBg: "bg-indigo-950/80 text-indigo-300 border border-indigo-800/60",
        progressColor: "bg-indigo-500",
        isStale: false,
      };
    }

    const diffSecs = Math.max(0, Math.floor((currentTime - lastSeen.getTime()) / 1000));

    if (diffSecs <= 25) {
      return {
        key: "in_progress",
        label: "In progress",
        badgeClass: "text-emerald-400 font-bold flex items-center gap-1.5",
        dotClass: "h-2 w-2 rounded-full bg-emerald-400 animate-pulse",
        avatarBg: "bg-indigo-950/80 text-indigo-300 border border-indigo-800/60",
        progressColor: "bg-indigo-500",
        isStale: false,
      };
    } else {
      const mins = Math.floor(diffSecs / 60);
      const timeStr = diffSecs < 60 ? `${diffSecs}s ago` : `${mins}m ago`;
      return {
        key: "reconnecting",
        label: "Reconnecting",
        badgeClass: "text-amber-400 font-bold flex items-center gap-1.5",
        dotClass: "h-2 w-2 rounded-full bg-amber-400 animate-ping",
        avatarBg: "bg-amber-950/80 text-amber-300 border border-amber-800/60",
        progressColor: "bg-amber-500",
        lastSeenText: timeStr,
        isStale: true,
      };
    }
  };

  // Filter active sessions list based on tab
  const tabSessions = useMemo(() => {
    return enrichedSessions.filter(s => {
      const isQA = s.isTestAttempt === true;
      if (activeTab === "students" && isQA) return false;
      if (activeTab === "qa" && !isQA) return false;
      return true;
    });
  }, [enrichedSessions, activeTab]);

  // Filtered and Sorted sessions
  const filteredSessions = useMemo(() => {
    return tabSessions
      .filter(s => {
        const matchesSearch =
          s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.examTitle && s.examTitle.toLowerCase().includes(searchTerm.toLowerCase()));

        const rowStatus = getCandidateRowStatus(s, now);

        let matchesStatus = true;
        if (statusFilter === "in_progress") matchesStatus = rowStatus.key === "in_progress";
        if (statusFilter === "reconnecting") matchesStatus = rowStatus.key === "reconnecting";
        if (statusFilter === "tab_switch") matchesStatus = rowStatus.key === "tab_switch";
        if (statusFilter === "submitted") matchesStatus = s.isCompleted;
        if (statusFilter === "active") matchesStatus = !s.isCompleted && !s.isExpiredStale;
        if (statusFilter === "expired") matchesStatus = s.isExpiredStale;

        let matchesExam = true;
        if (examFilter !== "all") matchesExam = s.examId === examFilter;

        let matchesDate = true;
        if (dateFilter === "today") matchesDate = s.isToday;
        if (dateFilter === "expired") matchesDate = s.isExpiredStale;

        return matchesSearch && matchesStatus && matchesExam && matchesDate;
      })
      .sort((a, b) => {
        if (!a.isCompleted && (b.isCompleted)) return -1;
        if (a.isCompleted && !b.isCompleted) return 1;

        const timeA = a.parsedStart ? a.parsedStart.getTime() : 0;
        const timeB = b.parsedStart ? b.parsedStart.getTime() : 0;
        return timeB - timeA;
      });
  }, [tabSessions, searchTerm, statusFilter, examFilter, dateFilter, now]);

  // Mockup Stat Counts scoped by tab
  const totalCandidatesCount = tabSessions.filter(s => dateFilter === "today" ? s.isToday : true).length;
  const inProgressCount = tabSessions.filter(s => getCandidateRowStatus(s, now).key === "in_progress").length;
  const submittedCount = tabSessions.filter(s => s.isCompleted).length;
  const reconnectingCount = tabSessions.filter(s => getCandidateRowStatus(s, now).key === "reconnecting").length;
  const flaggedCount = tabSessions.filter(s => getCandidateRowStatus(s, now).key === "tab_switch").length;
  const expiredCount = tabSessions.filter(s => s.isExpiredStale).length;

  // Add extra time mutation
  const addTimeMutation = useMutation({
    mutationFn: async ({ sessionId, extraMinutes }: { sessionId: string; extraMinutes: number }) => {
      const sessionRef = doc(db, "exam_sessions", sessionId);
      const currentSession = sessions.find(s => s.id === sessionId);
      if (!currentSession) return;

      const startDate = safeParseDate(currentSession.startedAt) || new Date();
      const newStartedAt = new Date(startDate.getTime() + extraMinutes * 60 * 1000);

      await updateDoc(sessionRef, {
        startedAt: newStartedAt
      });
    },
    onSuccess: () => {
      toast({
        title: "Extra Time Granted",
        description: `Candidate exam timer extended by ${extraTimeMinutes} minutes.`,
      });
      queryClient.invalidateQueries({ queryKey: ["invigilatorExamSessions"] });
      setSelectedSessionForAction(null);
      setActionType(null);
    },
    onError: (err) => {
      toast({
        title: "Action Failed",
        description: err instanceof Error ? err.message : "Failed to add extra time",
        variant: "destructive"
      });
    }
  });

  // Force submit mutation
  const forceSubmitMutation = useMutation({
    mutationFn: async (session: InvigilatorSession) => {
      return submitExamSession(session.id, session.answers || {}, "auto");
    },
    onSuccess: () => {
      toast({
        title: "Session Force Submitted",
        description: "The exam session has been finalized and graded.",
      });
      queryClient.invalidateQueries({ queryKey: ["invigilatorExamSessions"] });
      setSelectedSessionForAction(null);
      setActionType(null);
    },
    onError: (err) => {
      toast({
        title: "Submission Error",
        description: err instanceof Error ? err.message : "Failed to submit exam",
        variant: "destructive"
      });
    }
  });

  // Delete / Purge single session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return deleteExamSession(sessionId);
    },
    onSuccess: () => {
      toast({
        title: "Session Purged",
        description: "Session record deleted from live invigilator monitor.",
      });
      queryClient.invalidateQueries({ queryKey: ["invigilatorExamSessions"] });
      setSelectedSessionForAction(null);
      setActionType(null);
    },
    onError: (err) => {
      toast({
        title: "Delete Error",
        description: err instanceof Error ? err.message : "Failed to delete session",
        variant: "destructive"
      });
    }
  });

  // Bulk Purge Completed mutation
  const purgeCompletedMutation = useMutation({
    mutationFn: async () => {
      const completedSessions = sessions.filter(s => s.isCompleted);
      for (const s of completedSessions) {
        await deleteExamSession(s.id);
      }
    },
    onSuccess: () => {
      toast({
        title: "Completed Sessions Purged",
        description: "All submitted session records cleared from invigilator feed.",
      });
      queryClient.invalidateQueries({ queryKey: ["invigilatorExamSessions"] });
      setActionType(null);
    }
  });

  // Bulk Purge Expired mutation
  const purgeExpiredMutation = useMutation({
    mutationFn: async () => {
      const expiredSessions = enrichedSessions.filter(s => s.isExpiredStale);
      for (const s of expiredSessions) {
        await deleteExamSession(s.id);
      }
    },
    onSuccess: () => {
      toast({
        title: "Expired Stale Sessions Purged",
        description: "All unsubmitted stale sessions from past days have been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["invigilatorExamSessions"] });
      setActionType(null);
    }
  });

  const handleSendBroadcast = async () => {
    if (!broadcastMessageText.trim()) return;
    setIsBroadcasting(true);
    try {
      const count = await broadcastInvigilatorMessage(examFilter === "all" ? null : examFilter, broadcastMessageText);
      toast({
        title: "Broadcast Announcement Sent",
        description: `Delivered message to ${count} active student exam session(s).`,
      });
      setBroadcastMessageText("");
      setIsBroadcastModalOpen(false);
    } catch (err) {
      console.error("Broadcast Error:", err);
      toast({ title: "Broadcast Failed", description: "Could not send broadcast message.", variant: "destructive" });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleSendDirectMessage = async () => {
    if (!selectedStudentForMsg || !directMsgText.trim()) return;
    setIsSendingDirect(true);
    try {
      await sendStudentMessage(selectedStudentForMsg.id, directMsgText);
      toast({
        title: "Message Sent",
        description: `Delivered message to ${selectedStudentForMsg.studentName}.`,
      });
      setDirectMsgText("");
      setIsDirectMsgModalOpen(false);
      setSelectedStudentForMsg(null);
    } catch (err) {
      console.error("Direct Message Error:", err);
      toast({ title: "Message Failed", description: "Could not send message to candidate.", variant: "destructive" });
    } finally {
      setIsSendingDirect(false);
    }
  };

  // Multi-select helpers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSessionIds(new Set(filteredSessions.map(s => s.id)));
    } else {
      setSelectedSessionIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const next = new Set(selectedSessionIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedSessionIds(next);
  };

  // Bulk action modal state
  const [isBulkExtendTimeOpen, setIsBulkExtendTimeOpen] = useState(false);
  const [bulkExtraMinutes, setBulkExtraMinutes] = useState(5);

  const handleBulkExtendTimeSubmit = async () => {
    for (const id of Array.from(selectedSessionIds)) {
      await addTimeMutation.mutateAsync({ sessionId: id, extraMinutes: bulkExtraMinutes });
    }
    setSelectedSessionIds(new Set());
    setIsBulkExtendTimeOpen(false);
  };

  const handleBulkForceSubmit = async () => {
    const targetSessions = enrichedSessions.filter(s => selectedSessionIds.has(s.id) && !s.isCompleted);
    for (const s of targetSessions) {
      await forceSubmitMutation.mutateAsync(s);
    }
    setSelectedSessionIds(new Set());
  };

  const handleBulkDirectMessage = async () => {
    if (!directMsgText.trim()) return;
    setIsSendingDirect(true);
    try {
      for (const id of Array.from(selectedSessionIds)) {
        await sendStudentMessage(id, directMsgText);
      }
      toast({
        title: "Bulk Message Sent",
        description: `Message delivered to ${selectedSessionIds.size} selected candidate(s).`,
      });
      setDirectMsgText("");
      setIsDirectMsgModalOpen(false);
      setSelectedSessionIds(new Set());
    } catch (err) {
      console.error(err);
      toast({ title: "Bulk Message Failed", description: "Could not send message.", variant: "destructive" });
    } finally {
      setIsSendingDirect(false);
    }
  };

  // Currently active exam title for header subtitle
  const selectedExamObj = examFilter !== "all" ? exams.find(e => e.id === examFilter) : null;
  const activeExamTitle = selectedExamObj ? selectedExamObj.title : (exams[0]?.title || "Active Examination");

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl pb-12 font-sans bg-[#0c0d10] text-slate-100 p-4 sm:p-6 rounded-3xl min-h-screen border border-slate-800/80 shadow-2xl">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Invigilator overview
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">
            Today, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {activeExamTitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsBroadcastModalOpen(true)}
            className="bg-[#1c1d22] hover:bg-[#272830] text-white border border-slate-700/80 rounded-xl h-10 px-4 text-xs font-bold gap-2 shadow-md"
          >
            <Megaphone className="h-4 w-4 text-slate-300" />
            Broadcast
          </Button>

          <Button
            onClick={handleExportSessionLog}
            className="bg-[#1c1d22] hover:bg-[#272830] text-white border border-slate-700/80 rounded-xl h-10 px-4 text-xs font-bold gap-2 shadow-md"
          >
            <Download className="h-4 w-4 text-slate-300" />
            Export log
          </Button>

          <Button
            onClick={() => setIsLiveSyncEnabled(prev => !prev)}
            className={cn(
              "rounded-xl h-10 px-3.5 text-xs font-bold gap-2 shadow-md transition-all border",
              isLiveSyncEnabled
                ? "bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border-emerald-700/80"
                : "bg-[#1c1d22] hover:bg-[#272830] text-slate-400 border-slate-700/80"
            )}
            title={isLiveSyncEnabled ? "Live Polling ON (Auto-refetches every 15s)" : "Live Polling OFF (Click to turn ON live polling)"}
          >
            <Radio className={cn("h-4 w-4", isLiveSyncEnabled ? "animate-pulse text-emerald-400" : "text-slate-500")} />
            <span>{isLiveSyncEnabled ? "Live Sync: ON" : "Live Sync: OFF"}</span>
          </Button>

          <Button
            onClick={() => refetch()}
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl h-10 px-3 text-xs font-bold gap-1.5"
            title="Refresh feed manually"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* 2. Top 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-[#17181c] border border-slate-800/80 rounded-2xl p-4.5">
          <p className="text-[11px] font-bold text-slate-400">Total candidates</p>
          <p className="text-3xl font-black text-white mt-1.5">{totalCandidatesCount}</p>
        </div>

        <div className="bg-[#17181c] border border-slate-800/80 rounded-2xl p-4.5">
          <p className="text-[11px] font-bold text-slate-400">In progress</p>
          <p className="text-3xl font-black text-white mt-1.5">{inProgressCount}</p>
        </div>

        <div className="bg-[#17181c] border border-slate-800/80 rounded-2xl p-4.5">
          <p className="text-[11px] font-bold text-slate-400">Submitted</p>
          <p className="text-3xl font-black text-white mt-1.5">{submittedCount}</p>
        </div>

        <div className="bg-[#17181c] border border-amber-900/40 bg-amber-950/10 rounded-2xl p-4.5">
          <p className="text-[11px] font-bold text-amber-400">Reconnecting</p>
          <p className="text-3xl font-black text-amber-400 mt-1.5">{reconnectingCount}</p>
        </div>

        <div className="bg-[#17181c] border border-rose-900/40 bg-rose-950/10 rounded-2xl p-4.5">
          <p className="text-[11px] font-bold text-rose-400">Flagged</p>
          <p className="text-3xl font-black text-rose-400 mt-1.5">{flaggedCount}</p>
        </div>
      </div>

      {/* Stream Selection Tabs */}
      <div className="flex bg-[#17181c] p-1 rounded-xl border border-slate-800/80 w-full sm:w-fit mb-2">
        <Button
          onClick={() => setActiveTab("students")}
          className={cn(
            "h-8 rounded-lg text-xs font-black transition-all px-4 flex items-center gap-1.5 border-none",
            activeTab === "students" 
              ? "bg-[#272830] text-white shadow-sm font-bold" 
              : "bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/40"
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Active Students
        </Button>
        <Button
          onClick={() => setActiveTab("qa")}
          className={cn(
            "h-8 rounded-lg text-xs font-black transition-all px-4 flex items-center gap-1.5 border-none",
            activeTab === "qa" 
              ? "bg-[#272830] text-white shadow-sm font-bold" 
              : "bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/40"
          )}
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          QA Test Runs
        </Button>
      </div>

      {/* 3. Search, Filter & Purge Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search candidate name, ID or exam..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-[#17181c] border-slate-800 text-white placeholder:text-slate-500 rounded-xl h-10 text-xs font-medium focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          {/* Date Selector */}
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-40 bg-[#17181c] border-slate-800 text-white rounded-xl text-xs font-bold h-10">
              <SelectValue placeholder="Today" />
            </SelectTrigger>
            <SelectContent className="bg-[#1c1d22] border-slate-800 text-white">
              <SelectItem value="today">Today, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</SelectItem>
              <SelectItem value="all">All dates</SelectItem>
              <SelectItem value="expired">Stale / Expired</SelectItem>
            </SelectContent>
          </Select>

          {/* Exam Selector */}
          <Select value={examFilter} onValueChange={setExamFilter}>
            <SelectTrigger className="w-40 bg-[#17181c] border-slate-800 text-white rounded-xl text-xs font-bold h-10">
              <SelectValue placeholder="All exams" />
            </SelectTrigger>
            <SelectContent className="bg-[#1c1d22] border-slate-800 text-white">
              <SelectItem value="all">All exams</SelectItem>
              {exams.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Selector */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-[#17181c] border-slate-800 text-white rounded-xl text-xs font-bold h-10">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent className="bg-[#1c1d22] border-slate-800 text-white">
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="reconnecting">Reconnecting</SelectItem>
              <SelectItem value="tab_switch">Tab switch</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
            </SelectContent>
          </Select>

          {expiredCount > 0 && (
            <Button
              variant="outline"
              onClick={() => setActionType("purgeExpired")}
              className="border-rose-900/60 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 rounded-xl text-xs font-bold gap-1.5 h-10 px-3.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Purge expired ({expiredCount})
            </Button>
          )}
        </div>
      </div>

      {/* 4. Multi-Select Bulk Action Toolbar Bar */}
      {selectedSessionIds.size > 0 && (
        <div className="bg-[#0b1b36] border border-blue-900/60 text-white rounded-2xl p-3 px-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-blue-300 font-mono">
              {selectedSessionIds.size} selected
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => setIsDirectMsgModalOpen(true)}
              className="bg-[#162e54] hover:bg-[#1f3f73] text-white border border-blue-700/50 rounded-xl text-xs font-bold h-9 px-4 gap-1.5"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Message
            </Button>

            <Button
              onClick={() => setIsBulkExtendTimeOpen(true)}
              className="bg-[#162e54] hover:bg-[#1f3f73] text-white border border-blue-700/50 rounded-xl text-xs font-bold h-9 px-4 gap-1.5"
            >
              <Clock className="h-3.5 w-3.5" />
              Extend time
            </Button>

            <Button
              onClick={handleBulkForceSubmit}
              className="bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold h-9 px-4 gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Force submit
            </Button>
          </div>
        </div>
      )}

      {/* 5. Candidates Dark Table View */}
      <div className="bg-[#17181c] border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-8 space-y-3">
            <Skeleton className="h-10 w-full bg-slate-800/60 rounded-xl" />
            <Skeleton className="h-10 w-full bg-slate-800/60 rounded-xl" />
            <Skeleton className="h-10 w-full bg-slate-800/60 rounded-xl" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-16 text-center">
            <Clock className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300">No candidate sessions found</h3>
            <p className="text-xs text-slate-500 mt-1">Try clearing filters or search terms.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-[#121316] border-b border-slate-800/80">
              <TableRow className="hover:bg-transparent border-b border-slate-800/80">
                <TableHead className="w-12 text-center">
                  <Checkbox
                    checked={selectedSessionIds.size > 0 && selectedSessionIds.size === filteredSessions.length}
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    className="border-slate-600 data-[state=checked]:bg-indigo-600"
                  />
                </TableHead>
                <TableHead className="text-slate-400 text-xs font-bold uppercase tracking-wider">Candidate</TableHead>
                <TableHead className="text-slate-400 text-xs font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-slate-400 text-xs font-bold uppercase tracking-wider">Progress</TableHead>
                <TableHead className="text-slate-400 text-xs font-bold uppercase tracking-wider">Remaining</TableHead>
                <TableHead className="text-slate-400 text-xs font-bold uppercase tracking-wider">Last seen</TableHead>
                <TableHead className="w-12 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.map((session) => {
                const statusInfo = getCandidateRowStatus(session, now);
                const answeredCount = Object.keys(session.answers || {}).length;
                const totalCount = session.totalQuestionsCount || 1;
                const percent = Math.round((answeredCount / totalCount) * 100);

                const isLive = !session.isCompleted && !session.isExpiredStale;
                const elapsedMs = session.parsedStart ? Math.max(0, now - session.parsedStart.getTime()) : 0;
                const allowedMs = ((session.examDuration || 60) + (session.extendedMinutes || 0)) * 60 * 1000;
                const remainingMs = Math.max(0, allowedMs - elapsedMs);
                const remainingTimeHMS = session.isCompleted ? "—" : formatDurationHMS(remainingMs);

                const isChecked = selectedSessionIds.has(session.id);
                const initials = getInitials(session.studentName);

                return (
                  <TableRow
                    key={session.id}
                    className={`border-b border-slate-800/60 transition-colors ${
                      isChecked ? "bg-[#18263e]" : "hover:bg-[#1e1f25]"
                    }`}
                  >
                    {/* Checkbox Column */}
                    <TableCell className="text-center py-3.5">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => handleSelectOne(session.id, Boolean(checked))}
                        className="border-slate-600 data-[state=checked]:bg-indigo-600"
                      />
                    </TableCell>

                    {/* Candidate Column */}
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center font-extrabold text-xs tracking-wider shrink-0 ${statusInfo.avatarBg}`}>
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white leading-tight">
                            {session.studentName}
                          </p>
                          <p className="text-[11px] font-medium text-slate-400 mt-0.5 font-mono">
                            ID {session.studentId} - {session.examTitle}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Status Column */}
                    <TableCell className="py-3.5">
                      <div className={statusInfo.badgeClass}>
                        {statusInfo.icon ? (
                          <statusInfo.icon className="h-3.5 w-3.5 text-rose-400" />
                        ) : (
                          <div className={statusInfo.dotClass} />
                        )}
                        <span className="text-xs">{statusInfo.label}</span>
                      </div>
                    </TableCell>

                    {/* Progress Column */}
                    <TableCell className="py-3.5 w-44">
                      <div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1">
                          <div
                            className={`h-full rounded-full transition-all ${statusInfo.progressColor}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 font-mono">
                          {answeredCount} of {totalCount} ({percent}%)
                        </span>
                      </div>
                    </TableCell>

                    {/* Remaining Time Column */}
                    <TableCell className="py-3.5 font-mono text-xs font-extrabold text-slate-200">
                      {remainingTimeHMS}
                    </TableCell>
                    {/* Last Seen Column */}
                    <TableCell className="py-3.5 font-mono text-xs font-semibold">
                      {statusInfo.lastSeenText ? (
                        <span className={statusInfo.isStale ? "text-amber-400 font-extrabold" : "text-slate-400"}>
                          {statusInfo.lastSeenText}
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          {session.lastSeenAt ? `${Math.max(0, Math.floor((now - safeParseDate(session.lastSeenAt)!.getTime()) / 1000))}s ago` : "2s ago"}
                        </span>
                      )}
                    </TableCell>

                    {/* Actions Context Menu (...) */}
                    <TableCell className="text-right py-3.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-white rounded-lg">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1c1d22] border-slate-800 text-white rounded-xl w-44 p-1">
                          {!session.isCompleted && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedStudentForMsg(session);
                                  setIsDirectMsgModalOpen(true);
                                }}
                                className="text-xs font-semibold hover:bg-slate-800 rounded-lg cursor-pointer gap-2"
                              >
                                <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                                Send Message
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSessionForAction(session);
                                  setActionType("addTime");
                                }}
                                className="text-xs font-semibold hover:bg-slate-800 rounded-lg cursor-pointer gap-2"
                              >
                                <Clock className="h-3.5 w-3.5 text-amber-400" />
                                Extend Time (+5m)
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSessionForAction(session);
                                  setActionType("forceSubmit");
                                }}
                                className="text-xs font-semibold text-rose-400 hover:bg-rose-950/40 rounded-lg cursor-pointer gap-2"
                              >
                                <Send className="h-3.5 w-3.5" />
                                Force Submit
                              </DropdownMenuItem>
                            </>
                          )}

                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSessionForAction(session);
                              setActionType("deleteSession");
                            }}
                            className="text-xs font-semibold text-rose-400 hover:bg-rose-950/40 rounded-lg cursor-pointer gap-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Purge Session
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Bulk Extra Time Dialog */}
      <Dialog open={isBulkExtendTimeOpen} onOpenChange={setIsBulkExtendTimeOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-[#16171b] border-slate-800 text-white">
          <DialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center mb-2">
              <Clock className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-black">Extend Time ({selectedSessionIds.size} Selected)</DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-400 mt-1">
              Grant additional examination time to all currently checked candidate sessions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Extra Minutes to Grant</Label>
            <Select value={bulkExtraMinutes.toString()} onValueChange={(val) => setBulkExtraMinutes(parseInt(val))}>
              <SelectTrigger className="w-full bg-[#1c1d22] border-slate-800 text-white rounded-xl h-10 font-extrabold text-sm">
                <SelectValue placeholder="Select minutes" />
              </SelectTrigger>
              <SelectContent className="bg-[#1c1d22] border-slate-800 text-white">
                <SelectItem value="5">+5 Minutes</SelectItem>
                <SelectItem value="10">+10 Minutes</SelectItem>
                <SelectItem value="15">+15 Minutes</SelectItem>
                <SelectItem value="30">+30 Minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setIsBulkExtendTimeOpen(false)} className="rounded-xl font-bold border-slate-800 bg-[#121316] text-slate-300">
              Cancel
            </Button>
            <Button
              onClick={handleBulkExtendTimeSubmit}
              className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Confirm Grant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <AlertDialog open={!!selectedSessionForAction || actionType === "purgeCompleted" || actionType === "purgeExpired"} onOpenChange={() => {
        setSelectedSessionForAction(null);
        setActionType(null);
      }}>
        <AlertDialogContent className="rounded-2xl bg-[#16171b] border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black flex items-center gap-2">
              {actionType === "deleteSession" && <Trash2 className="h-5 w-5 text-rose-500" />}
              {actionType === "purgeCompleted" && <Trash2 className="h-5 w-5 text-rose-500" />}
              {actionType === "purgeExpired" && <Trash2 className="h-5 w-5 text-amber-500" />}
              {actionType === "forceSubmit" && <Send className="h-5 w-5 text-indigo-400" />}
              {actionType === "addTime" && <Clock className="h-5 w-5 text-indigo-400" />}
              
              {actionType === "deleteSession" && "Delete Live Session Record?"}
              {actionType === "purgeCompleted" && `Purge Completed Sessions?`}
              {actionType === "purgeExpired" && `Purge ${expiredCount} Expired Stale Sessions?`}
              {actionType === "forceSubmit" && "Force Submit Candidate Exam?"}
              {actionType === "addTime" && "Grant Extra Exam Time?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-medium text-slate-400 leading-relaxed">
              {actionType === "deleteSession" &&
                `Are you sure you want to delete session record for candidate "${selectedSessionForAction?.studentName}" (${selectedSessionForAction?.studentId})? This will purge any bug or stale data reflecting on the monitor feed.`}
              {actionType === "purgeCompleted" &&
                `Are you sure you want to delete completed session records from the invigilator monitor?`}
              {actionType === "purgeExpired" &&
                `Are you sure you want to delete all ${expiredCount} unsubmitted stale sessions from past days?`}
              {actionType === "forceSubmit" &&
                `Are you sure you want to force submit candidate ${selectedSessionForAction?.studentName}'s exam sheet? This action will finalize their grading.`}
              {actionType === "addTime" &&
                `Add ${extraTimeMinutes} extra minutes to candidate ${selectedSessionForAction?.studentName}'s active exam session timer?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold border-slate-800 bg-[#121316] text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (actionType === "forceSubmit" && selectedSessionForAction) {
                  forceSubmitMutation.mutate(selectedSessionForAction);
                } else if (actionType === "addTime" && selectedSessionForAction) {
                  addTimeMutation.mutate({ sessionId: selectedSessionForAction.id, extraMinutes: extraTimeMinutes });
                } else if (actionType === "deleteSession" && selectedSessionForAction) {
                  deleteSessionMutation.mutate(selectedSessionForAction.id);
                } else if (actionType === "purgeCompleted") {
                  purgeCompletedMutation.mutate();
                } else if (actionType === "purgeExpired") {
                  purgeExpiredMutation.mutate();
                }
              }}
              className={actionType === "deleteSession" || actionType === "purgeCompleted" || actionType === "purgeExpired" ? "bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl" : "bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl"}
            >
              Confirm Action
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Broadcast Message Modal */}
      <Dialog open={isBroadcastModalOpen} onOpenChange={setIsBroadcastModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-[#16171b] border-slate-800 text-white">
          <DialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center mb-2">
              <Megaphone className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-black">Broadcast Announcement</DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-400 mt-1">
              Send a high-priority alert banner to all candidates currently taking an active exam.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Announcement Message</Label>
            <Textarea
              placeholder="e.g., Attention candidates: 10 minutes remaining. Ensure all questions are answered."
              value={broadcastMessageText}
              onChange={(e) => setBroadcastMessageText(e.target.value)}
              className="min-h-[100px] rounded-xl font-medium bg-[#1c1d22] border-slate-800 text-white placeholder:text-slate-500"
            />
          </div>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setIsBroadcastModalOpen(false)} className="rounded-xl font-bold border-slate-800 bg-[#121316] text-slate-300">
              Cancel
            </Button>
            <Button
              onClick={handleSendBroadcast}
              disabled={isBroadcasting || !broadcastMessageText.trim()}
              className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isBroadcasting ? "Broadcasting..." : "Broadcast Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Direct Student Message Modal */}
      <Dialog open={isDirectMsgModalOpen} onOpenChange={setIsDirectMsgModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-[#16171b] border-slate-800 text-white">
          <DialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center mb-2">
              <MessageSquare className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-black">
              {selectedSessionIds.size > 0 ? `Message ${selectedSessionIds.size} Selected Candidate(s)` : `Message Student`}
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-400 mt-1">
              {selectedStudentForMsg
                ? `Send an inline message to candidate ${selectedStudentForMsg.studentName} (${selectedStudentForMsg.studentId}).`
                : `Send an inline message to all ${selectedSessionIds.size} checked candidates.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Message Content</Label>
            <Textarea
              placeholder="e.g., Please remain within the exam window. Your focus loss has been logged."
              value={directMsgText}
              onChange={(e) => setDirectMsgText(e.target.value)}
              className="min-h-[100px] rounded-xl font-medium bg-[#1c1d22] border-slate-800 text-white placeholder:text-slate-500"
            />
          </div>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setIsDirectMsgModalOpen(false)} className="rounded-xl font-bold border-slate-800 bg-[#121316] text-slate-300">
              Cancel
            </Button>
            <Button
              onClick={selectedSessionIds.size > 0 ? handleBulkDirectMessage : handleSendDirectMessage}
              disabled={isSendingDirect || !directMsgText.trim()}
              className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSendingDirect ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
