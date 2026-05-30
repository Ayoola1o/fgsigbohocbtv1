import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  HelpCircle, 
  Users, 
  TrendingUp, 
  GraduationCap, 
  Award,
  ChevronRight,
  Clock,
  Sparkles,
  BookOpen,
  ArrowUpRight
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import type { Exam, Question, Result, Student } from "@shared/schema";
import { useMemo } from "react";

export default function AdminDashboard() {
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
    totalStudents: new Set(results?.map((r) => r.studentId)).size || 0,
  };

  const passRate = results && results.length > 0
    ? Math.round((results.filter((r) => r.passed).length / results.length) * 100)
    : 0;

  const recentResults = results
    ? [...results].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()).slice(0, 5)
    : [];

  const subjectStats = exams?.reduce((acc, exam) => {
    const subjectResults = results?.filter((r) => r.examId === exam.id) || [];
    const avgScore = subjectResults.length > 0
      ? Math.round(
        subjectResults.reduce((sum, r) => sum + r.percentage, 0) /
        subjectResults.length
      )
      : 0;

    acc.push({
      subject: exam.subject,
      avgScore,
      students: subjectResults.length,
    });
    return acc;
  }, [] as { subject: string; avgScore: number; students: number }[]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Title Header */}
      <div className="bg-glass border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-xl shadow-slate-100/10 dark:shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Active System Dashboard</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-1 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent">
            System Overview
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-0.5">
            Real-time analytics, evaluation metrics, and test performance logs for Faith Immaculate Academy.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-900 px-3.5 py-1.5 rounded-full border border-slate-200/20 w-fit shrink-0">
          <Clock className="h-3.5 w-3.5 text-indigo-500" />
          <span>Session Auto-Refreshed</span>
        </div>
      </div>

      {/* Modern Stats Deck */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-none shadow-md bg-white dark:bg-slate-900 rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="h-8 w-16 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </Card>
          ))
        ) : (
          <>
            {/* Total Exams Card */}
            <Card className="border-none shadow-lg bg-white dark:bg-slate-900 relative overflow-hidden group hover:scale-[1.01] hover:shadow-xl transition-all duration-300 rounded-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-300">
                <FileText className="h-20 w-20 text-slate-800 dark:text-white" />
              </div>
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black text-slate-400 dark:text-slate-500 flex items-center gap-2 tracking-widest uppercase">
                  <FileText className="h-4 w-4 text-indigo-500" /> Total Exams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4.5xl font-black text-slate-800 dark:text-white leading-none" data-testid="text-total-exams">
                  {stats.totalExams}
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    style={{ width: `${stats.totalExams > 0 ? (stats.activeExams / stats.totalExams) * 100 : 0}%` }} 
                    className="bg-indigo-500 h-full rounded-full" 
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-bold uppercase tracking-wider">
                  {stats.activeExams} active evaluation sets
                </p>
              </CardContent>
            </Card>

            {/* Questions Bank Card */}
            <Card className="border-none shadow-lg bg-white dark:bg-slate-900 relative overflow-hidden group hover:scale-[1.01] hover:shadow-xl transition-all duration-300 rounded-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-300">
                <HelpCircle className="h-20 w-20 text-slate-800 dark:text-white" />
              </div>
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black text-slate-400 dark:text-slate-500 flex items-center gap-2 tracking-widest uppercase">
                  <HelpCircle className="h-4 w-4 text-emerald-500" /> Question Bank
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4.5xl font-black text-slate-800 dark:text-white leading-none" data-testid="text-total-questions">
                  {stats.totalQuestions}
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3" />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-bold uppercase tracking-wider">
                  Available query objects
                </p>
              </CardContent>
            </Card>

            {/* Total Students Card */}
            <Card className="border-none shadow-lg bg-white dark:bg-slate-900 relative overflow-hidden group hover:scale-[1.01] hover:shadow-xl transition-all duration-300 rounded-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-300">
                <Users className="h-20 w-20 text-slate-800 dark:text-white" />
              </div>
              <div className="absolute top-0 left-0 w-1 h-full bg-violet-500" />
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black text-slate-400 dark:text-slate-500 flex items-center gap-2 tracking-widest uppercase">
                  <Users className="h-4 w-4 text-violet-500" /> Tested Candidates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4.5xl font-black text-slate-800 dark:text-white leading-none" data-testid="text-total-students">
                  {stats.totalStudents}
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3" />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-bold uppercase tracking-wider">
                  Unique student test attempts
                </p>
              </CardContent>
            </Card>

            {/* Pass Rate Card */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white relative overflow-hidden group hover:scale-[1.01] hover:shadow-indigo-500/20 transition-all duration-300 rounded-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-25 transition-all duration-300">
                <TrendingUp className="h-20 w-20 text-white" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black text-indigo-200 flex items-center gap-2 tracking-widest uppercase">
                  <TrendingUp className="h-4 w-4 text-indigo-200" /> Average Pass Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4.5xl font-black text-white leading-none" data-testid="text-pass-rate">
                  {passRate}%
                </div>
                <div className="w-full bg-white/20 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    style={{ width: `${passRate}%` }} 
                    className="bg-emerald-400 h-full rounded-full" 
                  />
                </div>
                <p className="text-[10px] text-indigo-100 mt-2 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="h-3 w-3 text-emerald-400" /> School standards metrics
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Analysis Summary Indicators Dashboard */}
      {isLoading ? (
        <Skeleton className="h-[200px] w-full rounded-2xl animate-pulse" />
      ) : (
        <div className="grid gap-6 md:grid-cols-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Class-by-Class Analysis Card */}
          <Card className="border-none shadow-md bg-white dark:bg-slate-900 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
            <CardHeader className="border-b border-slate-50 dark:border-slate-800/40 pb-4">
              <CardTitle className="text-sm font-extrabold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <GraduationCap className="h-4.5 w-4.5 text-indigo-500" /> Class Level Performance
              </CardTitle>
              <CardDescription className="text-[10px]">Real average grade index segmented by grade level.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {Object.keys(schoolAnalysis.classScores).length > 0 ? (
                Object.entries(schoolAnalysis.classScores).map(([classLevel, scoreData]) => {
                  const data = scoreData as { total: number; sum: number; avg: number };
                  return (
                  <div key={classLevel} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                      <span>{classLevel} ({data.total} candidates)</span>
                      <span className="font-extrabold text-slate-800 dark:text-white">{data.avg}% Avg</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          data.avg >= 70 ? "bg-emerald-500" :
                          data.avg >= 50 ? "bg-indigo-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${data.avg}%` }}
                      />
                    </div>
                  </div>
                );})
              ) : (
                <div className="text-center text-slate-400 text-xs py-8">No class data found yet</div>
              )}
            </CardContent>
          </Card>

          {/* Department Performance Card */}
          <Card className="border-none shadow-md bg-white dark:bg-slate-900 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
            <CardHeader className="border-b border-slate-50 dark:border-slate-800/40 pb-4">
              <CardTitle className="text-sm font-extrabold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <TrendingUp className="h-4.5 w-4.5 text-indigo-500" /> Department Performance
              </CardTitle>
              <CardDescription className="text-[10px]">Comparative analytics across school segments.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {Object.keys(schoolAnalysis.deptScores).length > 0 ? (
                Object.entries(schoolAnalysis.deptScores).map(([dept, scoreData]) => {
                  const data = scoreData as { total: number; sum: number; avg: number };
                  return (
                  <div key={dept} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                      <span>{dept} Department</span>
                      <span className="font-extrabold text-slate-800 dark:text-white">{data.avg}% Avg</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          data.avg >= 70 ? "bg-emerald-500" :
                          data.avg >= 50 ? "bg-violet-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${data.avg}%` }}
                      />
                    </div>
                  </div>
                );})
              ) : (
                <div className="text-center text-slate-400 text-xs py-8">No department data found yet</div>
              )}
            </CardContent>
          </Card>

          {/* Top Performer Rankings Card */}
          <Card className="border-none shadow-md bg-white dark:bg-slate-900 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
            <CardHeader className="border-b border-slate-50 dark:border-slate-800/40 pb-4">
              <CardTitle className="text-sm font-extrabold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Award className="h-4.5 w-4.5 text-indigo-500" /> High-Performing Candidates
              </CardTitle>
              <CardDescription className="text-[10px]">Leaderboard of the school's top scoring active students.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4.5 space-y-3">
              {schoolAnalysis.topStudents.length > 0 ? (
                schoolAnalysis.topStudents.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100/40 dark:border-slate-800/40 hover:scale-[1.01] transition-transform duration-200">
                    <div className="flex items-center gap-2">
                      <div className={`h-6 w-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                        idx === 0 ? "bg-amber-100 text-amber-700" :
                        idx === 1 ? "bg-slate-200 text-slate-700" :
                        idx === 2 ? "bg-orange-100 text-orange-700" : "bg-indigo-50 text-indigo-700"
                      }`}>
                        {idx === 0 ? "🏆" : idx + 1}
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{s.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{s.class} • {s.dept}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{s.score}%</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 text-xs py-8">No results loaded yet</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts and Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Performance by Subject */}
        <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-50 dark:border-slate-800/40 pb-4">
            <CardTitle className="text-base font-extrabold flex items-center gap-2 text-slate-850 dark:text-white">
              <BookOpen className="h-4.5 w-4.5 text-indigo-500" /> Performance by Subject
            </CardTitle>
            <CardDescription className="text-xs">Visual breakdown of exam percentage scores across subjects.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : subjectStats && subjectStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectStats}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.95}/>
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0.25}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800/40" />
                  <XAxis dataKey="subject" className="text-[10px] font-bold fill-slate-400 dark:fill-slate-500" />
                  <YAxis className="text-[10px] font-bold fill-slate-400 dark:fill-slate-500" unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      border: "1px solid rgba(0, 0, 0, 0.05)",
                      borderRadius: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
                    }}
                    labelClassName="font-extrabold text-xs text-slate-850"
                  />
                  <Bar dataKey="avgScore" fill="url(#barGrad)" radius={[8, 8, 0, 0]} name="Avg Score">
                    {subjectStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-slate-400">
                <HelpCircle className="h-8 w-8 text-slate-200 dark:text-slate-800 mr-2" />
                No statistical subject data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Results Log */}
        <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-slate-50 dark:border-slate-800/40 pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2 text-slate-850 dark:text-white">
                <Award className="h-4.5 w-4.5 text-indigo-500" /> Recent Results Log
              </CardTitle>
              <CardDescription className="text-xs">Stream of active candidates completing subject evaluations.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                  ))}
                </div>
              ) : recentResults && recentResults.length > 0 ? (
                <div className="space-y-3.5">
                  {recentResults.map((result) => (
                    <Link key={result.id} href={`/admin/results/${result.id}`}>
                      <div className="flex items-center justify-between rounded-xl border border-slate-50 dark:border-slate-850 p-4 hover:bg-slate-50/50 dark:hover:bg-slate-950/40 hover:scale-[1.01] hover:shadow-sm transition-all duration-300 group cursor-pointer">
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 text-indigo-700 dark:text-indigo-400 font-extrabold shrink-0 flex items-center justify-center shadow-inner">
                            {result.studentName.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <p className="font-extrabold text-slate-800 dark:text-slate-200 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                              {result.studentName}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                              Passcode: {result.studentId}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4 flex items-center gap-4">
                          <div>
                            <span
                              className={`text-lg font-black tracking-tight ${result.passed ? "text-emerald-500" : "text-rose-500"}`}
                            >
                              {result.percentage}%
                            </span>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                              {new Date(result.completedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-350 dark:text-slate-700 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all duration-300" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-slate-400">
                  <Clock className="h-8 w-8 text-slate-200 dark:text-slate-800 mr-2" />
                  No evaluation attempts logged yet
                </div>
              )}
            </CardContent>
          </div>
          {recentResults && recentResults.length > 0 && (
            <div className="p-5 border-t border-slate-50 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-950/20 rounded-b-2xl">
              <Link href="/admin/results">
                <Button 
                  variant="ghost" 
                  className="w-full text-xs font-extrabold text-indigo-600 hover:text-indigo-755 hover:bg-indigo-50/50 dark:text-indigo-400 dark:hover:bg-indigo-950/20 rounded-xl flex items-center justify-center gap-1.5"
                >
                  View Full Evaluation Reports <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
