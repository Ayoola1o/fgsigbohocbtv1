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
  Radio
} from "lucide-react";
import { getDocs, collection, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { submitExamSession } from "@/lib/firebase-api";
import type { ExamSession, Exam } from "@shared/schema";

interface InvigilatorSession extends ExamSession {
  examTitle?: string;
  totalQuestionsCount?: number;
}

export default function AdminInvigilatorPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSessionForAction, setSelectedSessionForAction] = useState<InvigilatorSession | null>(null);
  const [actionType, setActionType] = useState<"addTime" | "forceSubmit" | null>(null);

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

  // Enrich sessions with exam metadata
  const enrichedSessions = useMemo(() => {
    return sessions.map(s => {
      const ex = examMap.get(s.examId);
      const totalCount = s.sessionQuestionIds?.length || ex?.questionIds?.length || 0;
      return {
        ...s,
        examTitle: ex?.title || "Examination",
        totalQuestionsCount: totalCount,
      };
    });
  }, [sessions, examMap]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return enrichedSessions.filter(s => {
      const matchesSearch =
        s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.examTitle && s.examTitle.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === "active") matchesStatus = !s.isCompleted;
      if (statusFilter === "completed") matchesStatus = !!s.isCompleted;

      return matchesSearch && matchesStatus;
    });
  }, [enrichedSessions, searchTerm, statusFilter]);

  // Stats
  const activeCount = enrichedSessions.filter(s => !s.isCompleted).length;
  const completedCount = enrichedSessions.filter(s => s.isCompleted).length;

  // Add extra time mutation
  const addTimeMutation = useMutation({
    mutationFn: async ({ sessionId, extraMinutes }: { sessionId: string; extraMinutes: number }) => {
      const sessionRef = doc(db, "exam_sessions", sessionId);
      const currentSession = sessions.find(s => s.id === sessionId);
      if (!currentSession) return;

      const currentStartedAt = new Date(currentSession.startedAt).getTime();
      const newStartedAt = new Date(currentStartedAt + extraMinutes * 60 * 1000);

      await updateDoc(sessionRef, {
        startedAt: newStartedAt
      });
    },
    onSuccess: () => {
      toast({
        title: "Extra Time Added",
        description: "Candidate exam timer has been extended by 5 minutes.",
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

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="border border-indigo-100/50 dark:border-indigo-950/40 bg-gradient-to-tr from-indigo-50/50 via-white to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                Live Active Candidates
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Play className="h-4 w-4 fill-current" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white mt-2">{activeCount}</p>
            <p className="text-[11px] text-slate-400 font-bold mt-1">Currently taking exams</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                Completed Sessions
              </span>
              <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <CheckCircle className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white mt-2">{completedCount}</p>
            <p className="text-[11px] text-slate-400 font-bold mt-1">Submitted result sheets</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                Total Sessions Monitored
              </span>
              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white mt-2">{enrichedSessions.length}</p>
            <p className="text-[11px] text-slate-400 font-bold mt-1">Registered candidate attempts</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search candidate name, ID or exam..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-medium"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="completed">Completed Only</SelectItem>
            </SelectContent>
          </Select>
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
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No active exam sessions found</h3>
            <p className="text-xs text-slate-400 mt-1">Candidate exam sessions will appear here in real-time when students start their tests.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSessions.map((session) => {
            const answeredCount = Object.keys(session.answers || {}).length;
            const totalCount = session.totalQuestionsCount || 1;
            const percent = Math.round((answeredCount / totalCount) * 100);

            return (
              <Card
                key={session.id}
                className={`border transition-all shadow-md rounded-2xl overflow-hidden ${
                  session.isCompleted
                    ? "border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 opacity-80"
                    : "border-indigo-100 dark:border-indigo-900/40 bg-white dark:bg-slate-900 hover:shadow-lg"
                }`}
              >
                <CardHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-md ${
                            session.isCompleted
                              ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          }`}
                        >
                          {session.isCompleted ? "Submitted" : "Live Active"}
                        </Badge>
                        <span className="text-[10px] font-mono font-bold text-slate-400">{session.studentId}</span>
                      </div>
                      <CardTitle className="text-base font-black text-slate-850 dark:text-white mt-1.5">
                        {session.studentName}
                      </CardTitle>
                      <CardDescription className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {session.examTitle}
                      </CardDescription>
                    </div>

                    {!session.isCompleted && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSessionForAction(session);
                            setActionType("addTime");
                          }}
                          className="h-8 text-[11px] font-bold border-indigo-200 dark:border-indigo-900 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-50"
                        >
                          <PlusCircle className="mr-1 h-3.5 w-3.5" />
                          +5 Min
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedSessionForAction(session);
                            setActionType("forceSubmit");
                          }}
                          className="h-8 text-[11px] font-bold px-3"
                        >
                          <Send className="mr-1 h-3 w-3" />
                          Submit
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      <span>Candidate Progress</span>
                      <span>{answeredCount} of {totalCount} Answered ({percent}%)</span>
                    </div>
                    <Progress value={percent} className="h-2 rounded-full bg-slate-100 dark:bg-slate-800" />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium pt-1 border-t border-slate-100 dark:border-slate-800/40">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>Started: {new Date(session.startedAt).toLocaleTimeString()}</span>
                    </div>
                    {session.endedAt && (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Ended: {new Date(session.endedAt).toLocaleTimeString()}</span>
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
      <AlertDialog open={!!selectedSessionForAction} onOpenChange={() => setSelectedSessionForAction(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black">
              {actionType === "addTime" && "Grant Extra Time"}
              {actionType === "forceSubmit" && "Force Submit Exam Session"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-medium text-slate-500">
              {actionType === "addTime" &&
                `Are you sure you want to add 5 minutes extra time for candidate ${selectedSessionForAction?.studentName}?`}
              {actionType === "forceSubmit" &&
                `Are you sure you want to force submit candidate ${selectedSessionForAction?.studentName}'s exam sheet? This action will finalize their grading.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (actionType === "addTime" && selectedSessionForAction) {
                  addTimeMutation.mutate({ sessionId: selectedSessionForAction.id, extraMinutes: 5 });
                } else if (actionType === "forceSubmit" && selectedSessionForAction) {
                  forceSubmitMutation.mutate(selectedSessionForAction);
                }
              }}
              className="bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold rounded-xl"
            >
              Confirm Action
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
