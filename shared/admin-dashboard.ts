type DashboardResult = {
  id: string;
  studentName: string;
  title: string | null;
  classLevel: string | null;
  department: string | null;
  percentage: number;
  passed: boolean;
  completedAt: string;
};

export type DashboardData = {
  students: number;
  activeExams: number;
  questions: number;
  activeAttempts: number;
  summary: ReturnType<typeof summarizeDashboard>;
};

type Outcomes = { passed: number; total: number };
export const passRate = ({ passed, total }: Outcomes) => total ? Math.round(1000 * passed / total) / 10 : 0;
const monthFormat = new Intl.DateTimeFormat("en-NG", { month: "short", year: "numeric", timeZone: "Africa/Lagos" });
export function summarizeDashboard(results: DashboardResult[]) {
  const sorted = [...results].sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt));
  const months = new Map<string, Outcomes>();
  const classes = new Map<string, Outcomes>();
  const departments = new Map<string, Outcomes>();
  const overall = { passed: 0, total: sorted.length };
  function add(groups: Map<string, Outcomes>, label: string, passed: boolean) {
    const entry = groups.get(label) ?? { total: 0, passed: 0 };
    entry.total++;
    if (passed) entry.passed++;
    groups.set(label, entry);
  }
  for (const result of sorted) {
    if (result.passed) overall.passed++;
    add(months, monthFormat.format(new Date(result.completedAt)), result.passed);
    if (result.classLevel) add(classes, result.classLevel, result.passed);
    add(departments, result.department || "Unassigned", result.passed);
  }
  const toSeries = (groups: Map<string, Outcomes>) => Array.from(groups, ([name, outcomes]) => {
    const rate = passRate(outcomes);
    return { name, Pass: rate, Fail: Math.round((100 - rate) * 10) / 10, total: outcomes.total };
  });
  return {
    overall,
    months: toSeries(months).slice(-6),
    classes: toSeries(classes).sort((a, b) => b.Pass - a.Pass || b.total - a.total).slice(0, 5),
    departments: toSeries(departments),
    recent: sorted.slice(-5).reverse(),
  };
}
