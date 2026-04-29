import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";

const COLORS = [
  "var(--color-primary)",
  "var(--color-gold)",
  "var(--color-success)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export function ProgressPage() {
  const studentsQ = useQuery({ queryKey: ["students"], queryFn: api.listStudents });
  const progressQ = useQuery({ queryKey: ["progress", "all"], queryFn: () => api.listProgress("all") });

  const students = studentsQ.data ?? [];
  const progress = progressQ.data ?? [];

  const programData = useMemo(() => {
    const byProgram = new Map<string, number>();
    students.forEach((s) => byProgram.set(s.program, (byProgram.get(s.program) ?? 0) + 1));
    return Array.from(byProgram.entries()).map(([name, value]) => ({ name, value }));
  }, [students]);

  const gpaBuckets = useMemo(() => {
    const buckets = [
      { range: "<2.5", min: 0, max: 2.5, count: 0 },
      { range: "2.5–3.0", min: 2.5, max: 3.0, count: 0 },
      { range: "3.0–3.5", min: 3.0, max: 3.5, count: 0 },
      { range: "3.5–4.0", min: 3.5, max: 4.01, count: 0 },
    ];
    students.forEach((s) => {
      const b = buckets.find((b) => s.gpa >= b.min && s.gpa < b.max);
      if (b) b.count++;
    });
    return buckets;
  }, [students]);

  const topStudents = useMemo(
    () => [...students].sort((a, b) => b.gpa - a.gpa).slice(0, 5),
    [students],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Class progress</h1>
        <p className="text-sm text-muted-foreground">Trends, distributions, and leaders</p>
      </div>

      <Card className="p-6">
        <h2 className="font-display text-xl">Average score over time</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progress}>
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
              <Line
                type="monotone"
                dataKey="average"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={{ fill: "var(--color-primary)", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-xl">GPA distribution</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gpaBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="range" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-xl">By program</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={programData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {programData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-display text-xl">Top performers</h2>
        <p className="text-sm text-muted-foreground">By cumulative GPA</p>
        <div className="mt-4 divide-y divide-border">
          {topStudents.map((s, i) => (
            <div key={s.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 font-display text-sm text-gold-foreground">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{s.fullName}</p>
                  <p className="text-xs text-muted-foreground">{s.program} · Year {s.year}</p>
                </div>
              </div>
              <p className="font-display text-xl">{s.gpa.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
