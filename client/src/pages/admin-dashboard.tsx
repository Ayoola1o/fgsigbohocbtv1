import { passRate, summarizeDashboard, type DashboardData } from "@shared/admin-dashboard";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Activity, ArrowRight, BarChart3, CalendarDays, ClipboardList, Database,
  GraduationCap, PieChart as PieIcon, RefreshCw, Trophy, UsersRound,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { SystemSettings } from "@shared/schema";

const resultDate = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeZone: "Africa/Lagos" });
const metrics = [
  { key: "students", title: "Total students", icon: UsersRound, color: "bg-blue-600 shadow-blue-500/25", tint: "from-blue-50", href: "/admin/students" },
  { key: "activeExams", title: "Active examinations", icon: ClipboardList, color: "bg-teal-500 shadow-teal-500/25", tint: "from-teal-50", href: "/admin/exams" },
  { key: "questions", title: "Question bank", icon: Database, color: "bg-violet-600 shadow-violet-500/25", tint: "from-violet-50", href: "/admin/questions" },
  { key: "activeAttempts", title: "Open exam attempts", icon: Activity, color: "bg-orange-500 shadow-orange-500/25", tint: "from-orange-50", href: "/admin/invigilator" },
] as const;
const panel = "min-w-0 rounded-2xl border border-blue-100/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900";
const empty = "flex min-h-36 items-center justify-center p-4 text-center text-sm text-slate-500 dark:text-slate-400";

const emptySummary = summarizeDashboard([]);

export default function AdminDashboard() {
  const dashboard = useQuery<DashboardData>({
    queryKey: ["/api/admin/dashboard"],
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const { data: settings } = useQuery<SystemSettings>({ queryKey: ["/api/settings"] });
  const { data: banner } = useQuery<{ image: string }>({ queryKey: ["/api/admin/dashboard/banner"], retry: false });
  const summary = dashboard.data?.summary ?? emptySummary;
  const hasResults = summary.overall.total > 0;
  const outcomes = [
    { name: "Passed", value: summary.overall.passed, fill: "#00ad83" },
    { name: "Failed", value: summary.overall.total - summary.overall.passed, fill: "#ff8b36" },
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 text-slate-950 dark:text-slate-100">
      <section className="relative isolate flex min-h-44 items-center justify-between overflow-hidden rounded-2xl bg-[#061953] px-6 py-7 text-white shadow-lg shadow-blue-900/15 sm:px-9">
        {banner?.image && <img src={banner.image} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#061953] via-blue-950/60 to-[#061953]/75" />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">Welcome, Admin!</h1>
          <p className="mt-1 text-sm text-blue-50 sm:text-lg">{settings?.schoolName || "Faith Immaculate Academy"} · CBT Management</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
            <CalendarDays size={15} /> {new Intl.DateTimeFormat("en-NG", { dateStyle: "full", timeZone: "Africa/Lagos" }).format(new Date())}
          </div>
        </div>
        <p className="hidden max-w-36 text-right font-semibold italic lg:block">Smart assessment.<br />Better results.</p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600 dark:text-slate-400">
        <span role="status">{dashboard.isError ? (dashboard.data ? "Refresh failed. Showing the last available snapshot." : "Dashboard metrics are unavailable.") : dashboard.data ? `Updated ${new Date(dashboard.dataUpdatedAt).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "numeric", minute: "2-digit", second: "2-digit" })} WAT · Refreshes every 30 seconds while open` : "Loading dashboard metrics…"}</span>
        <button type="button" disabled={dashboard.isFetching} onClick={() => void dashboard.refetch()} className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3 py-1.5 font-semibold text-blue-800 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300">
          <RefreshCw size={13} className={dashboard.isFetching ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ key, title, icon: Icon, color, tint, href }) => (
          <Link key={key} href={href} className={`${panel} flex items-center gap-4 bg-gradient-to-tr ${tint} to-transparent transition-shadow hover:shadow-md dark:from-transparent`}>
            <span className={`grid size-14 shrink-0 place-items-center rounded-2xl text-white shadow-lg ${color}`}><Icon size={27} /></span>
            <span><span className="block text-sm font-semibold">{title}</span><span className="block text-3xl font-extrabold tracking-tight tabular-nums">{dashboard.data?.[key].toLocaleString() ?? "—"}</span></span>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr]">
        <section className={panel}>
          <h2 className="flex items-center gap-2 font-bold"><BarChart3 className="text-blue-600" size={20} /> Overall performance</h2>
          <p className="mt-1 text-xs text-slate-500">Last six months with recorded results</p>
          {hasResults ? <div className="mt-3 h-52">
            <ResponsiveContainer>
              <AreaChart data={summary.months} margin={{ top: 12, left: -22, right: 12 }}>
                <CartesianGrid stroke="#94a3b8" strokeOpacity={0.22} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tickFormatter={(n) => `${n}%`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Area type="monotone" dataKey="Pass" stroke="#1464ff" strokeWidth={2.5} fill="#1464ff" fillOpacity={0.13} dot={{ r: 3 }} />
                <Area type="monotone" dataKey="Fail" stroke="#ff8b36" strokeWidth={2} fill="#ff8b36" fillOpacity={0.08} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div> : <p className={empty}>{dashboard.data ? "No completed results yet." : "Results unavailable."}</p>}
        </section>
        <section className={panel}>
          <h2 className="flex items-center gap-2 font-bold"><PieIcon className="text-blue-600" size={20} /> Attempt outcomes</h2>
          {hasResults ? <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="relative h-40 min-w-36 flex-1">
              <ResponsiveContainer>
                <PieChart><Pie data={outcomes} dataKey="value" innerRadius="68%" outerRadius="96%" stroke="none">
                  {outcomes.map((outcome) => <Cell key={outcome.name} fill={outcome.fill} />)}
                </Pie></PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid content-center text-center"><strong className="text-2xl">{passRate(summary.overall)}%</strong><span className="text-xs text-slate-500">Pass rate</span></div>
            </div>
            <div className="space-y-3 text-sm">{outcomes.map((outcome) => <div key={outcome.name}><span className="mr-2 inline-block size-2.5 rounded-full" style={{ background: outcome.fill }} />{outcome.name}<strong className="ml-2">{outcome.value.toLocaleString()}</strong></div>)}</div>
          </div> : <p className={empty}>{dashboard.data ? "No completed results yet." : "Results unavailable."}</p>}
        </section>
        <section className={panel}>
          <h2 className="flex items-center gap-2 font-bold"><Trophy className="text-amber-500" size={20} /> Top performing classes</h2>
          {summary.classes.length ? <ol className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {summary.classes.map((entry, index) => <li key={entry.name} className="flex items-center gap-3 py-2 text-sm"><span className="grid size-7 place-items-center rounded-lg bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{index + 1}</span><span className="flex-1 font-medium">{entry.name} <small className="text-slate-500">· {entry.total} attempts</small></span><strong className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-800">{entry.Pass}%</strong></li>)}
          </ol> : <p className={empty}>{dashboard.data ? "No class results to rank yet." : "Results unavailable."}</p>}
        </section>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1.35fr] 2xl:grid-cols-[1.15fr_1.45fr_0.72fr]">
        <section className={panel}>
          <h2 className="flex items-center gap-2 font-bold"><BarChart3 className="text-blue-600" size={20} /> Department performance</h2>
          {hasResults ? <div className="mt-3 h-48">
            <ResponsiveContainer>
              <BarChart data={summary.departments} margin={{ top: 8, left: -22, right: 8 }}>
                <CartesianGrid stroke="#94a3b8" strokeOpacity={0.22} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                <YAxis domain={[0, 100]} tickFormatter={(n) => `${n}%`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Bar dataKey="Pass" fill="#1464ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Fail" fill="#ff8b36" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div> : <p className={empty}>{dashboard.data ? "No completed results yet." : "Results unavailable."}</p>}
        </section>
        <section className={panel}>
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-bold"><ClipboardList className="text-blue-600" size={20} /> Recent examination results</h2><Link href="/admin/results" className="flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-300">View all <ArrowRight size={13} /></Link></div>
          {hasResults ? <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs"><thead className="bg-blue-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><tr>{["Student", "Exam", "Score", "Status", "Date"].map((label) => <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{summary.recent.map((result) => <tr key={result.id}><td className="p-2 font-semibold">{result.studentName}</td><td className="p-2">{result.title || "Exam unavailable"}</td><td className="p-2 tabular-nums">{result.percentage}%</td><td className="p-2"><span className={`rounded-full px-2 py-0.5 font-semibold ${result.passed ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}`}>{result.passed ? "Pass" : "Fail"}</span></td><td className="whitespace-nowrap p-2">{resultDate.format(new Date(result.completedAt))}</td></tr>)}</tbody>
            </table>
          </div> : <p className={empty}>{dashboard.data ? "No completed results yet." : "Results unavailable."}</p>}
        </section>
        <section className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-gradient-to-br from-[#081c64] via-blue-800 to-violet-600 p-5 text-white xl:col-span-2 2xl:col-span-1">
          <GraduationCap size={38} />
          <div><h2 className="text-lg font-bold">Academic excellence</h2><p className="mt-1 text-sm text-blue-50">Explore exam results and performance across the school.</p></div>
          <Link href="/admin/analytics" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-blue-950">View reports <ArrowRight size={14} /></Link>
        </section>
      </div>
    </div>
  );
}
