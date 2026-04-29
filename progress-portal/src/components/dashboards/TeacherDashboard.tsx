import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

export function TeacherDashboard() {
  const { user } = useAuth();
  const studentsQ = useQuery({ queryKey: ["students"], queryFn: api.listStudents });
  const assignmentsQ = useQuery({ queryKey: ["assignments"], queryFn: api.listAssignments });
  const submissionsQ = useQuery({ queryKey: ["submissions"], queryFn: () => api.listSubmissions() });
  const progressQ = useQuery({ queryKey: ["progress", "all"], queryFn: () => api.listProgress("all") });

  const students = studentsQ.data ?? [];
  const assignments = assignmentsQ.data ?? [];
  const submissions = submissionsQ.data ?? [];

  const pending = submissions.filter((s) => s.status === "submitted").length;
  const graded = submissions.filter((s) => s.status === "graded").length;
  const avgGpa =
    students.length === 0
      ? 0
      : students.reduce((sum, s) => sum + s.gpa, 0) / students.length;
  const upcoming = [...assignments]
    .filter((a) => a.status === "published" && new Date(a.dueDate) > new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="mt-1 font-display text-4xl text-balance">
          Good to see you, {user?.fullName.split(" ")[0]}.
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Here's a snapshot of your classroom — students, assignments, and progress at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Students" value={students.length} hint="Active enrollments" />
        <StatCard icon={BookOpenCheck} label="Assignments" value={assignments.length} hint={`${assignments.filter(a=>a.status==="published").length} published`} />
        <StatCard icon={Clock} label="Awaiting grade" value={pending} hint="Submissions to review" tone="warning" />
        <StatCard icon={TrendingUp} label="Class GPA" value={avgGpa.toFixed(2)} hint={`${graded} graded items`} tone="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl">Class progress</h2>
              <p className="text-sm text-muted-foreground">Average score across the term</p>
            </div>
            <Badge variant="secondary" className="bg-success/15 text-success">
              <ArrowUpRight className="mr-1 h-3 w-3" /> Trending up
            </Badge>
          </div>
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressQ.data ?? []}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary-glow)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-primary-glow)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} domain={[60, 100]} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="average"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  fill="url(#grad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-xl">Upcoming due</h2>
          <p className="text-sm text-muted-foreground">Next deadlines for your courses</p>
          <ul className="mt-4 space-y-3">
            {upcoming.length === 0 && (
              <li className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                No upcoming deadlines.
              </li>
            )}
            {upcoming.map((a) => {
              const days = Math.ceil((new Date(a.dueDate).getTime() - Date.now()) / 86400000);
              return (
                <li key={a.id} className="rounded-md border border-border bg-muted/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.course}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        days <= 3
                          ? "border-warning/40 bg-warning/15 text-warning-foreground"
                          : "border-border"
                      }
                    >
                      {days === 0 ? "Today" : `${days}d`}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
          <Link
            to="/assignments"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Manage assignments <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl">Recent submissions</h2>
            <p className="text-sm text-muted-foreground">Latest student activity</p>
          </div>
          <Link to="/assignments" className="text-sm font-medium text-primary hover:underline">
            Review all
          </Link>
        </div>
        <div className="mt-4 divide-y divide-border">
          {submissions.slice(0, 5).map((s) => {
            const student = students.find((st) => st.id === s.studentId);
            const assignment = assignments.find((a) => a.id === s.assignmentId);
            return (
              <div key={s.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{student?.fullName ?? "Unknown"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {assignment?.title ?? "—"} · {assignment?.course ?? ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {s.status === "graded" ? (
                    <Badge className="bg-success/15 text-success hover:bg-success/15">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      {s.score}/{assignment?.maxScore ?? "—"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-warning/40 bg-warning/15 text-warning-foreground">
                      <Clock className="mr-1 h-3 w-3" /> Pending
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  hint: string;
  tone?: "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "bg-warning/15 text-warning-foreground"
      : tone === "success"
        ? "bg-success/15 text-success"
        : "bg-primary/10 text-primary";
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-display text-2xl">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
}
