import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Hourglass
} from "lucide-react";
import { getDocs, collection, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { submitExamSession, deleteExamSession } from "@/lib/firebase-api";
import type { ExamSession, Exam } from "@shared/schema";
import { useEffect } from "react";

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

export default function AdminInvigilatorPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [examFilter, setExamFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("today"); // default to Today
  const [extraTimeMinutes, setExtraTimeMinutes] = useState<number>(5);
  const [selectedSessionForAction, setSelectedSessionForAction] = useState<InvigilatorSession | null>(null);
  const [actionType, setActionType] = useState<"addTime" | "forceSubmit" | "deleteSession" | "purgeCompleted" | "purgeExpired" | "forceSubmitAll" | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // 1-second live ticker for real-time exam duration tracking
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = new Date().toDateString();

  // Fetch all active exam sessions
  const { data: sessions = [], isLoading, refetch } = useQuery<InvigilatorSession[]>({
    queryKey: ["invigilatorExamSessions"],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, "exam_sessions"));
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as InvigilatorSession);
      return list;
    },
    refetchInterval: 5000,
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

  // Filtered and Sorted sessions (Latest ongoing exams on top)
  const filteredSessions = useMemo(() => {
    return enrichedSessions
      .filter(s => {
        const matchesSearch =
          s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.examTitle && s.examTitle.toLowerCase().includes(searchTerm.toLowerCase()));

        let matchesStatus = true;
        if (statusFilter === "active") matchesStatus = !s.isCompleted && !s.isExpiredStale;
        if (statusFilter === "completed") matchesStatus = !!s.isCompleted;
        if (statusFilter === "expired") matchesStatus = s.isExpiredStale;

        let matchesExam = true;
        if (examFilter !== "all") matchesExam = s.examId === examFilter;

        let matchesDate = true;
        if (dateFilter === "today") matchesDate = s.isToday;
        if (dateFilter === "expired") matchesDate = s.isExpiredStale;

        return matchesSearch && matchesStatus && matchesExam && matchesDate;
      })
      .sort((a, b) => {
        // 1. Live active ongoing sessions come first
        if (!a.isCompleted && !a.isExpiredStale && (b.isCompleted || b.isExpiredStale)) return -1;
        if ((a.isCompleted || a.isExpiredStale) && !b.isCompleted && !b.isExpiredStale) return 1;

        // 2. Sort newest startedAt first
        const timeA = a.parsedStart ? a.parsedStart.getTime() : 0;
        const timeB = b.parsedStart ? b.parsedStart.getTime() : 0;
        return timeB - timeA;
      });
  }, [enrichedSessions, searchTerm, statusFilter, examFilter, dateFilter]);

  // Live Stats for Today
  const liveActiveCount = enrichedSessions.filter(s => !s.isCompleted && s.isToday && !s.isExpiredStale).length;
  const completedTodayCount = enrichedSessions.filter(s => s.isCompleted && s.isToday).length;
  const expiredCount = enrichedSessions.filter(s => s.isExpiredStale).length;
  const totalMonitoredCount = enrichedSessions.filter(s => dateFilter === "today" ? s.isToday : true).length;

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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl">
      {/* Title Header */}
      <div className="bg-glass border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-650 dark:text-indigo-400">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              Live Examination Monitor
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-1 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent">
            Invigilator Operations Hub
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-0.5">
            Real-time candidate monitoring dashboard, timing controls, and invigilator exam hall overrides.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Feed
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border border-emerald-200/60 dark:border-emerald-950/40 bg-gradient-to-tr from-emerald-50/50 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                Live Active Today
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Play className="h-4 w-4 fill-current animate-pulse" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white mt-2">{liveActiveCount}</p>
            <p className="text-[11px] text-slate-400 font-bold mt-1">Taking exam right now</p>
          </CardContent>
        </Card>

        <Card className="border border-indigo-100 dark:border-indigo-950/40 bg-white dark:bg-slate-900 shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                Completed Today
              </span>
              <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <CheckCircle className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white mt-2">{completedTodayCount}</p>
            <p className="text-[11px] text-slate-400 font-bold mt-1">Submitted today</p>
          </CardContent>
        </Card>

        <Card className="border border-amber-200/60 dark:border-amber-950/40 bg-white dark:bg-slate-900 shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                Expired / Stale
              </span>
              <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertOctagon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white mt-2">{expiredCount}</p>
            <p className="text-[11px] text-slate-400 font-bold mt-1">Unsubmitted past sessions</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                Total Monitored
              </span>
              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white mt-2">{totalMonitoredCount}</p>
            <p className="text-[11px] text-slate-400 font-bold mt-1">Filtered sessions count</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search candidate name, ID or exam..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          {/* Today Calendar Date Filter Dropdown */}
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-44 bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-black flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Date Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today ({new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</SelectItem>
              <SelectItem value="all">All Session Dates</SelectItem>
              <SelectItem value="expired">Stale / Expired Only</SelectItem>
            </SelectContent>
          </Select>

          {/* Exam Filter Dropdown */}
          <Select value={examFilter} onValueChange={setExamFilter}>
            <SelectTrigger className="w-40 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold">
              <SelectValue placeholder="All Exams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              {exams.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter Dropdown */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Live Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="expired">Expired Stale</SelectItem>
            </SelectContent>
          </Select>

          {expiredCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionType("purgeExpired")}
              className="rounded-xl border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-400 hover:bg-amber-50 text-xs font-bold h-9"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Purge Expired ({expiredCount})
            </Button>
          )}

          {completedTodayCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionType("purgeCompleted")}
              className="rounded-xl border-rose-200 text-rose-600 dark:border-rose-900 dark:text-rose-400 hover:bg-rose-50 text-xs font-bold h-9"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Purge Completed
            </Button>
          )}
        </div>
      </div>

      {/* Candidates Live Session Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      ) : filteredSessions.length === 0 ? (
        <Card className="border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
          <CardContent>
            <Clock className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No active exam sessions found for this filter</h3>
            <p className="text-xs text-slate-400 mt-1">Candidate exam sessions will appear here in real-time when students start their tests.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSessions.map((session) => {
            const answeredCount = Object.keys(session.answers || {}).length;
            const totalCount = session.totalQuestionsCount || 1;
            const percent = Math.round((answeredCount / totalCount) * 100);

            const isLive = !session.isCompleted && !session.isExpiredStale;

            // Live Time Calculations using 1-second ticker `now`
            const elapsedMs = session.parsedStart ? Math.max(0, now - session.parsedStart.getTime()) : 0;
            const liveDurationHMS = formatDurationHMS(elapsedMs);

            const allowedMs = (session.examDuration || 60) * 60 * 1000;
            const remainingMs = Math.max(0, allowedMs - elapsedMs);
            const liveRemainingHMS = formatDurationHMS(remainingMs);
            const liveTimePercent = Math.min(100, Math.round((elapsedMs / allowedMs) * 100));

            return (
              <Card
                key={session.id}
                className={`border transition-all shadow-md rounded-2xl overflow-hidden relative ${
                  session.isCompleted
                    ? "border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 opacity-85"
                    : session.isExpiredStale
                    ? "border-amber-200 dark:border-amber-950/40 bg-amber-50/20 dark:bg-amber-950/10"
                    : "border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-slate-900 hover:shadow-lg"
                }`}
              >
                <CardHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={`font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-md ${
                            session.isCompleted
                              ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              : session.isExpiredStale
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 animate-pulse"
                          }`}
                        >
                          {session.isCompleted ? "Submitted" : session.isExpiredStale ? "Expired / Stale" : "Live Active"}
                        </Badge>
                        <span className="text-[10px] font-mono font-bold text-slate-400">{session.studentId}</span>
                        {isLive && (
                          <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 px-2 py-0.5 rounded-md font-mono">
                            Time Spent: {liveDurationHMS}
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-base font-black text-slate-855 dark:text-white mt-1.5">
                        {session.studentName}
                      </CardTitle>
                      <CardDescription className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {session.examTitle}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!session.isCompleted && (
                        <>
                          {/* Extra Time Grant Dropdown / Preset */}
                          <Select
                            value={extraTimeMinutes.toString()}
                            onValueChange={(val) => {
                              const mins = parseInt(val);
                              setExtraTimeMinutes(mins);
                              addTimeMutation.mutate({ sessionId: session.id, extraMinutes: mins });
                            }}
                          >
                            <SelectTrigger className="h-8 w-20 text-[10px] font-extrabold border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 rounded-lg">
                              <SelectValue placeholder="+5 Min" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="5">+5 Mins</SelectItem>
                              <SelectItem value="10">+10 Mins</SelectItem>
                              <SelectItem value="15">+15 Mins</SelectItem>
                              <SelectItem value="30">+30 Mins</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedSessionForAction(session);
                              setActionType("forceSubmit");
                            }}
                            className="h-8 text-[11px] font-bold px-2.5 rounded-lg"
                            title="Force Submit Exam"
                          >
                            <Send className="mr-1 h-3 w-3" />
                            Submit
                          </Button>
                        </>
                      )}

                      {/* Delete / Purge Session Button */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setSelectedSessionForAction(session);
                          setActionType("deleteSession");
                        }}
                        className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                        title="Delete Session Record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-3.5">
                  {/* Candidate Answer Progress */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      <span>Question Progress</span>
                      <span>{answeredCount} of {totalCount} Answered ({percent}%)</span>
                    </div>
                    <Progress value={percent} className="h-2 rounded-full bg-slate-100 dark:bg-slate-800" />
                  </div>

                  {/* Candidate Live Exam Time Tracker */}
                  {isLive && (
                    <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-150 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-extrabold">
                        <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
                          <Clock className="h-3.5 w-3.5 text-indigo-500" />
                          Time Spent: <strong className="font-mono">{liveDurationHMS}</strong>
                        </span>
                        <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                          <Hourglass className="h-3.5 w-3.5 text-amber-500" />
                          Remaining: <strong className="font-mono">{liveRemainingHMS}</strong>
                        </span>
                      </div>
                      <Progress value={liveTimePercent} className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium pt-1 border-t border-slate-100 dark:border-slate-800/40">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>Started: {session.parsedStart ? session.parsedStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"} ({session.parsedStart ? session.parsedStart.toLocaleDateString([], { month: 'short', day: 'numeric' }) : ""})</span>
                    </div>
                    {session.parsedEnd && (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Ended: {session.parsedEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      <AlertDialog open={!!selectedSessionForAction || actionType === "purgeCompleted" || actionType === "purgeExpired"} onOpenChange={() => {
        setSelectedSessionForAction(null);
        setActionType(null);
      }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black flex items-center gap-2">
              {actionType === "deleteSession" && <Trash2 className="h-5 w-5 text-rose-600" />}
              {actionType === "purgeCompleted" && <Trash2 className="h-5 w-5 text-rose-600" />}
              {actionType === "purgeExpired" && <Trash2 className="h-5 w-5 text-amber-600" />}
              {actionType === "forceSubmit" && <Send className="h-5 w-5 text-indigo-600" />}
              
              {actionType === "deleteSession" && "Delete Live Session Record?"}
              {actionType === "purgeCompleted" && `Purge Completed Sessions?`}
              {actionType === "purgeExpired" && `Purge ${expiredCount} Expired Stale Sessions?`}
              {actionType === "forceSubmit" && "Force Submit Candidate Exam?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-medium text-slate-500 leading-relaxed">
              {actionType === "deleteSession" &&
                `Are you sure you want to delete session record for candidate "${selectedSessionForAction?.studentName}" (${selectedSessionForAction?.studentId})? This will purge any bug or stale data reflecting on the monitor feed.`}
              {actionType === "purgeCompleted" &&
                `Are you sure you want to delete completed session records from the invigilator monitor?`}
              {actionType === "purgeExpired" &&
                `Are you sure you want to delete all ${expiredCount} unsubmitted stale sessions from past days?`}
              {actionType === "forceSubmit" &&
                `Are you sure you want to force submit candidate ${selectedSessionForAction?.studentName}'s exam sheet? This action will finalize their grading.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (actionType === "forceSubmit" && selectedSessionForAction) {
                  forceSubmitMutation.mutate(selectedSessionForAction);
                } else if (actionType === "deleteSession" && selectedSessionForAction) {
                  deleteSessionMutation.mutate(selectedSessionForAction.id);
                } else if (actionType === "purgeCompleted") {
                  purgeCompletedMutation.mutate();
                } else if (actionType === "purgeExpired") {
                  purgeExpiredMutation.mutate();
                }
              }}
              className={actionType === "deleteSession" || actionType === "purgeCompleted" || actionType === "purgeExpired" ? "bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl" : "bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold rounded-xl"}
            >
              Confirm Action
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
