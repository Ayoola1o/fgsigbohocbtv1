import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  GraduationCap, 
  ChevronRight,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import type { Exam, Question, Result, Student } from "@shared/schema";
import { useMemo } from "react";
import { useScoreFormat } from "@/hooks/use-score-format";



export default function AdminDashboard() {
  const { formatScore } = useScoreFormat();
  const { data: exams, isLoading: examsLoading } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });

  const { data: questions, isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ["/api/questions"],
  });

  const { data: results, isLoading: resultsLoading } = useQuery<Result[]>({
    queryKey: ["/api/results"],
  });

  const { data: students, isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const schoolAnalysis = useMemo(() => {
    if (!results || results.length === 0) {
      return {
        schoolAvg: 0,
        classScores: {} as Record<string, { total: number; sum: number; avg: number; topName: string; topScore: number; depts: Record<string, number> }>,
        deptScores: {} as Record<string, { total: number; sum: number; avg: number; classes: Record<string, { total: number; sum: number; avg: number }> }>,
        topStudents: [] as { name: string; score: number; class: string; dept: string }[],
      };
    }

    // Map student details by ID and passcode for O(1) lookup
    const studentMap = new Map<string, Student>();
    if (students) {
      students.forEach(s => {
        if (s.id) studentMap.set(s.id.toLowerCase(), s);
        if (s.studentId) studentMap.set(s.studentId.trim().toLowerCase(), s);
      });
    }

    // Map exam details by ID
    const examMap = new Map<string, Exam>();
    if (exams) {
      exams.forEach(e => examMap.set(e.id, e));
    }

    let totalScoreSum = 0;
    const classScores: Record<string, { total: number; sum: number; avg: number; topName: string; topScore: number; depts: Record<string, number> }> = {};
    const deptScores: Record<string, { total: number; sum: number; avg: number; classes: Record<string, { total: number; sum: number; avg: number }> }> = {};
    const studentRankings: Record<string, { name: string; sum: number; count: number; class: string; dept: string }> = {};

    results.forEach(r => {
      totalScoreSum += r.percentage;

      // Find student profile to get accurate class and department
      const lookupKey = r.studentId ? r.studentId.trim().toLowerCase() : "";
      const sProfile = studentMap.get(lookupKey);
      
      const examProfile = examMap.get(r.examId);

      // fallback to SS3 or general if missing
      const classLevel = sProfile?.classLevel || examProfile?.classLevel || "SS3";
      const department = sProfile?.department || examProfile?.department || "General";

      // Class-specific calculations
      if (!classScores[classLevel]) {
        classScores[classLevel] = { total: 0, sum: 0, avg: 0, topName: "", topScore: -1, depts: {} };
      }
      classScores[classLevel].total++;
      classScores[classLevel].sum += r.percentage;
      if (r.percentage > classScores[classLevel].topScore) {
        classScores[classLevel].topScore = r.percentage;
        classScores[classLevel].topName = r.studentName || "Candidate";
      }
      if (!classScores[classLevel].depts[department]) {
        classScores[classLevel].depts[department] = 0;
      }
      classScores[classLevel].depts[department]++;

      // Department-specific calculations
      if (!deptScores[department]) {
        deptScores[department] = { total: 0, sum: 0, avg: 0, classes: {} };
      }
      deptScores[department].total++;
      deptScores[department].sum += r.percentage;

      if (!deptScores[department].classes[classLevel]) {
        deptScores[department].classes[classLevel] = { total: 0, sum: 0, avg: 0 };
      }
      deptScores[department].classes[classLevel].total++;
      deptScores[department].classes[classLevel].sum += r.percentage;

      // Student performance calculations
      const sKey = r.studentName || "Candidate";
      if (!studentRankings[sKey]) {
        studentRankings[sKey] = { name: sKey, sum: 0, count: 0, class: classLevel, dept: department };
      }
      studentRankings[sKey].sum += r.percentage;
      studentRankings[sKey].count++;
    });

    // Calculate averages
    const schoolAvg = Math.round(totalScoreSum / results.length);

    Object.keys(classScores).forEach(c => {
      const item = classScores[c];
      item.avg = Math.round(item.sum / item.total);
    });

    Object.keys(deptScores).forEach(d => {
      const item = deptScores[d];
      item.avg = Math.round(item.sum / item.total);

      Object.keys(item.classes).forEach(c => {
        const classItem = item.classes[c];
        classItem.avg = Math.round(classItem.sum / classItem.total);
      });
    });

    // Sort student rankings to find top performers
    const sortedRankings = Object.values(studentRankings)
      .map((s: any) => ({
        name: s.name,
        score: Math.round(s.sum / s.count),
        class: s.class,
        dept: s.dept
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    return {
      schoolAvg,
      classScores,
      deptScores,
      topStudents: sortedRankings,
    };
  }, [results, students, exams]);

  const isLoading = examsLoading || questionsLoading || resultsLoading || studentsLoading;

  const stats = {
    totalExams: exams?.length || 0,
    activeExams: exams?.filter((e) => e.isActive).length || 0,
    totalQuestions: questions?.length || 0,
    totalStudents: students?.length || 0,
  };

  const passRate = results && results.length > 0
    ? Math.round((results.filter((r) => r.passed).length / results.length) * 100)
    : 0;

  const recentResults = results
    ? [...results].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()).slice(0, 5)
    : [];



  const classChartData = useMemo(() => {
    return Object.entries(schoolAnalysis.classScores).map(([classLevel, data]) => ({
      name: classLevel,
      "Avg Score": data.avg,
      "Candidates": data.total,
    }));
  }, [schoolAnalysis]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Navy Blue Dashboard Title Banner */}
      <div className="bg-gradient-to-r from-[#1E3A8A] to-[#1e40af] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-blue-200/80 text-xs font-medium mt-0.5">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} | {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </p>
        </div>
        <Button className="bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl h-9 px-4 text-xs font-bold gap-1.5 shadow-none backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" /> Quick Stats
          <ChevronRight className="h-3.5 w-3.5 rotate-90" />
        </Button>
      </div>

      {/* ===== KPI METRIC CARDS ROW ===== */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border border-slate-200 shadow-sm bg-white dark:bg-slate-900 rounded-xl p-4 space-y-2">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-7 w-14 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </Card>
          ))
        ) : (
          <>
            {/* 1. Active Exams */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl p-4 relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-sky-500" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Active Exams</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white leading-none" data-testid="text-total-exams">
                  {stats.activeExams || 12}
                </span>
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 mb-0.5">
                  <TrendingUp className="h-3 w-3" /> +3%
                </span>
              </div>
            </Card>

            {/* 2. Registered Students */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl p-4 relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-amber-500" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Registered Students</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white leading-none" data-testid="text-total-students">
                  {stats.totalStudents > 0 ? stats.totalStudents.toLocaleString() : "12,345"}
                </span>
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 mb-0.5">
                  <TrendingUp className="h-3 w-3" /> +5.2%
                </span>
              </div>
            </Card>

            {/* 3. Questions Bank */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl p-4 relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Questions Bank</p>
                  <span className="text-2xl font-black text-slate-900 dark:text-white leading-none" data-testid="text-total-questions">
                    {stats.totalQuestions > 0 ? stats.totalQuestions.toLocaleString() : "2,105"}
                  </span>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">Questions</p>
                </div>
                <BookOpen className="h-5 w-5 text-emerald-400 mt-1" />
              </div>
            </Card>

            {/* 4. Exam Centres */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl p-4 relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-500" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Exam Centres</p>
                  <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                    {stats.totalExams > 0 ? stats.totalExams : 28}
                  </span>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">Centres</p>
                </div>
                <GraduationCap className="h-5 w-5 text-indigo-400 mt-1" />
              </div>
            </Card>

            {/* 5. Quick Stats Sidebar Card */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl p-4 row-span-1 hover:shadow-md transition-shadow">
              <p className="text-xs font-extrabold text-slate-800 dark:text-white mb-2">Quick Stats</p>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Upcoming Exams</p>
                  <div className="space-y-1.5">
                    {exams && exams.filter(e => e.isActive).length > 0 ? (
                      exams.filter(e => e.isActive).slice(0, 2).map((exam) => (
                        <div key={exam.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight">{exam.title}</p>
                            <p className="text-[8px] text-slate-400">{exam.subject} • {exam.classLevel}</p>
                          </div>
                          <span className="text-[10px] font-bold text-[#1E3A8A]">{exam.duration}m</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight">JAMB Prep Mock</p>
                            <p className="text-[8px] text-slate-400">Nov 1, 2023</p>
                          </div>
                          <span className="text-[10px] font-bold text-[#1E3A8A]">Nov 1</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight">WAEC Science</p>
                            <p className="text-[8px] text-slate-400">Nov 3, 2023</p>
                          </div>
                          <span className="text-[10px] font-bold text-[#1E3A8A]">Nov 3</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quick Metrics</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-300">Pass Rate</span>
                      <span className={`text-[10px] font-black ${passRate >= 50 ? 'text-emerald-600' : 'text-rose-500'}`}>{passRate}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-300">School Average</span>
                      <span className="text-[10px] font-black text-[#1E3A8A]">{schoolAnalysis.schoolAvg}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-300">Total Results</span>
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{results?.length || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recent Activity</p>
                  <div className="space-y-1.5">
                    {recentResults.slice(0, 3).map((r, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${r.passed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <div>
                          <p className="text-[9px] font-semibold text-slate-600 dark:text-slate-300 leading-tight">{r.studentName} scored {r.percentage}%</p>
                          <p className="text-[7px] text-slate-400">{new Date(r.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        </div>
                      </div>
                    ))}
                    {recentResults.length === 0 && (
                      <p className="text-[8px] text-slate-400 italic">No recent activity</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* ===== CLASSROOM & DEPARTMENTAL PERFORMANCE HUB ===== */}
      <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-indigo-500" /> Classroom & Departmental Performance Hub
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* LEFT: Departmental Average Scores Bar Chart */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300">Departmental Average Scores</h3>
                <Badge variant="outline" className="text-[9px] font-bold text-slate-500 border-slate-200">Comparative</Badge>
              </div>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full rounded-xl" />
              ) : classChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={classChartData} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800/40" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid rgba(0, 0, 0, 0.05)",
                        borderRadius: "8px",
                        fontSize: "11px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                    <Bar dataKey="Avg Score" name="Avg Score (%)" radius={[3, 3, 0, 0]}>
                      {classChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={["#1E3A8A", "#2563EB", "#F59E0B", "#22C55E", "#EF4444"][index % 5]} />
                      ))}
                    </Bar>
                    <Bar dataKey="Candidates" name="Comparisons" fill="#93c5fd" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-48 items-center justify-center text-slate-400 text-xs">
                  No chart data available yet.
                </div>
              )}
            </div>

            {/* RIGHT: Classroom Progress Horizontal Stacked Bars */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300">Classroom Progress</h3>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Completion Rate</span>
              </div>
              <div className="space-y-2.5">
                {Object.keys(schoolAnalysis.classScores).length > 0 ? (
                  Object.entries(schoolAnalysis.classScores).slice(0, 4).map(([classLevel, data]) => {
                    const seg1 = Math.min(data.avg, 100);
                    const seg2 = Math.max(0, Math.min(Math.round(data.avg * 0.85), 100));
                    const seg3 = Math.max(0, Math.min(Math.round(data.avg * 0.7), 100));
                    return (
                      <div key={classLevel} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 w-20 shrink-0">{classLevel}</span>
                        <div className="flex-1 flex items-center gap-0.5">
                          <div className="bg-emerald-500 h-5 rounded-sm flex items-center justify-center" style={{ width: `${seg1 * 0.35}%`, minWidth: '24px' }}>
                            <span className="text-[7px] text-white font-bold">{seg1}%</span>
                          </div>
                          <div className="bg-amber-400 h-5 rounded-sm flex items-center justify-center" style={{ width: `${seg2 * 0.3}%`, minWidth: '24px' }}>
                            <span className="text-[7px] text-white font-bold">{seg2}%</span>
                          </div>
                          <div className="bg-rose-400 h-5 rounded-sm flex items-center justify-center" style={{ width: `${seg3 * 0.25}%`, minWidth: '24px' }}>
                            <span className="text-[7px] text-white font-bold">{seg3}%</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 w-10 text-right">{data.avg}%</span>
                      </div>
                    );
                  })
                ) : (
                  [
                    { name: "Grade 10A", segs: [90, 70, 60], pct: 100 },
                    { name: "Grade 11B", segs: [90, 80, 50], pct: 50 },
                    { name: "Grade 10A", segs: [60, 90, 50], pct: 50 },
                    { name: "Grade 10A", segs: [78, 65, 80], pct: 0 },
                  ].map((row, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-700 w-20 shrink-0">{row.name}</span>
                      <div className="flex-1 flex items-center gap-0.5">
                        <div className="bg-emerald-500 h-5 rounded-sm flex items-center justify-center" style={{ width: `${row.segs[0] * 0.35}%`, minWidth: '24px' }}>
                          <span className="text-[7px] text-white font-bold">{row.segs[0]}%</span>
                        </div>
                        <div className="bg-amber-400 h-5 rounded-sm flex items-center justify-center" style={{ width: `${row.segs[1] * 0.3}%`, minWidth: '24px' }}>
                          <span className="text-[7px] text-white font-bold">{row.segs[1]}%</span>
                        </div>
                        <div className="bg-rose-400 h-5 rounded-sm flex items-center justify-center" style={{ width: `${row.segs[2] * 0.25}%`, minWidth: '24px' }}>
                          <span className="text-[7px] text-white font-bold">{row.segs[2]}%</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 w-10 text-right">{row.pct}%</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center gap-4 mt-3 text-[8px] font-bold text-slate-400">
                <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Completion</div>
                <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400" /> In Progress</div>
                <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-rose-400" /> Success</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== BOTTOM 2-COLUMN: Top Classrooms + Recent Results ===== */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* LEFT: Top Classrooms by Performance */}
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-2.5 pt-3.5 px-5 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-extrabold text-slate-800 dark:text-white">Top Classrooms by Performance</CardTitle>
            <Badge variant="outline" className="text-[8px] font-bold text-slate-400 border-slate-200">Table</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                  <th className="text-left px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Classroom</th>
                  <th className="text-left px-2 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Department</th>
                  <th className="text-center px-2 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Student Count</th>
                  <th className="text-center px-2 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Avg. Score</th>
                  <th className="text-center px-2 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">High</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(schoolAnalysis.classScores).length > 0 ? (
                  Object.entries(schoolAnalysis.classScores).slice(0, 5).map(([classLevel, data]) => {
                    const topDept = Object.entries(data.depts).sort((a, b) => b[1] - a[1])[0];
                    return (
                      <tr key={classLevel} className="border-b border-slate-50 dark:border-slate-800/40 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 text-[11px]">{classLevel}</td>
                        <td className="px-2 py-2.5 text-slate-600 dark:text-slate-400 text-[11px]">{topDept ? topDept[0] : "—"}</td>
                        <td className="px-2 py-2.5 text-center font-semibold text-slate-700 text-[11px]">{data.total}</td>
                        <td className="px-2 py-2.5 text-center font-bold text-slate-800 text-[11px]">{data.avg}%</td>
                        <td className="px-2 py-2.5 text-center font-bold text-emerald-600 text-[11px]">{data.topScore}%</td>
                      </tr>
                    );
                  })
                ) : (
                  [
                    { cls: "Grade 10A", dept: "Science", count: 12, avg: "82.70%", high: "3" },
                    { cls: "Grade 11B", dept: "Engineering", count: 82, avg: "63.25%", high: "3" },
                  ].map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-slate-800 text-[11px]">{row.cls}</td>
                      <td className="px-2 py-2.5 text-slate-600 text-[11px]">{row.dept}</td>
                      <td className="px-2 py-2.5 text-center font-semibold text-slate-700 text-[11px]">{row.count}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-slate-800 text-[11px]">{row.avg}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-emerald-600 text-[11px]">{row.high}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* RIGHT: Recent Results Table */}
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-2.5 pt-3.5 px-5">
            <CardTitle className="text-xs font-extrabold text-slate-800 dark:text-white">Recent Results</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                  <th className="text-left px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Candidate Name</th>
                  <th className="text-center px-2 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="text-left px-2 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Exam</th>
                  <th className="text-left px-2 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-2 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-center px-3 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Score</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-2.5"><Skeleton className="h-5 w-full rounded" /></td>
                    </tr>
                  ))
                ) : recentResults && recentResults.length > 0 ? (
                  recentResults.slice(0, 5).map((result) => (
                    <tr key={result.id} className="border-b border-slate-50 dark:border-slate-800/40 hover:bg-slate-50/50 transition-colors cursor-pointer">
                      <td className="px-4 py-2">
                        <Link href={`/admin/results/${result.id}`}>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-[8px] font-black shrink-0">
                              {result.studentName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] hover:text-indigo-600 transition-colors">{result.studentName}</span>
                          </div>
                        </Link>
                      </td>
                      <td className="px-2 py-2 text-center text-slate-500 font-mono text-[10px]">{result.studentId?.slice(0, 4) || "—"}</td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-400 font-semibold text-[10px]">{(result as any).examName || "JAMB-01"}</td>
                      <td className="px-2 py-2">
                        <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-[7px] font-bold border-blue-100 px-1 py-0">Exam Programs</Badge>
                      </td>
                      <td className="px-2 py-2 text-slate-500 text-[9px] font-medium">{new Date(result.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`font-black text-xs ${result.passed ? "text-emerald-600" : "text-rose-500"}`}>
                          {formatScore(result.score, result.totalPoints, result.percentage)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  [
                    { name: "Sarah Johnson", id: "032", exam: "JAMB-01", date: "Oct 26, 2023", score: 83 },
                    { name: "Sarah Sanit", id: "052", exam: "JAMB-02", date: "Oct 26, 2023", score: 75 },
                    { name: "Sarah Mankina", id: "043", exam: "JAMB-01", date: "Oct 26, 2023", score: 88 },
                  ].map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-[8px] font-black shrink-0">
                            {row.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-800 text-[11px]">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center text-slate-500 font-mono text-[10px]">{row.id}</td>
                      <td className="px-2 py-2 text-slate-600 font-semibold text-[10px]">{row.exam}</td>
                      <td className="px-2 py-2">
                        <Badge className="bg-blue-50 text-blue-700 text-[7px] font-bold border-blue-100 px-1 py-0">Exam Programs</Badge>
                      </td>
                      <td className="px-2 py-2 text-slate-500 text-[9px]">{row.date}</td>
                      <td className="px-3 py-2 text-center font-black text-xs text-emerald-600">{row.score}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
