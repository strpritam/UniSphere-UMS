import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth-context";

export function MyGradesPage() {
  const { user } = useAuth();
  const studentQ = useQuery({
    queryKey: ["student-by-email", user?.email],
    queryFn: () => api.getStudentByEmail(user!.email),
    enabled: !!user,
  });
  const student = studentQ.data;
  const gradesQ = useQuery({
    queryKey: ["my-grades", student?.id],
    queryFn: () => api.listGrades(student!.id),
    enabled: !!student,
  });

  const grades = gradesQ.data ?? [];

  const byCourse = useMemo(() => {
    const map = new Map<string, { course: string; sum: number; max: number; count: number }>();
    grades.forEach((g) => {
      const cur = map.get(g.course) ?? { course: g.course, sum: 0, max: 0, count: 0 };
      cur.sum += g.score;
      cur.max += g.maxScore;
      cur.count += 1;
      map.set(g.course, cur);
    });
    return Array.from(map.values()).map((c) => ({
      ...c,
      pct: (c.sum / c.max) * 100,
    }));
  }, [grades]);

  const trend = useMemo(
    () =>
      grades.map((g) => ({
        name: g.assessment,
        score: Math.round((g.score / g.maxScore) * 100),
      })),
    [grades],
  );

  if (!student) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">My grades</h1>
        <p className="text-sm text-muted-foreground">
          GPA {student.gpa.toFixed(2)} · {grades.length} graded items
        </p>
      </div>

      <Card className="p-6">
        <h2 className="font-display text-xl">Performance trend</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={{ fill: "var(--color-primary)", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {byCourse.map((c) => (
          <Card key={c.course} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg">{c.course}</p>
                <p className="text-xs text-muted-foreground">{c.count} assessments</p>
              </div>
              <p className="font-display text-2xl">{c.pct.toFixed(0)}%</p>
            </div>
            <Progress value={c.pct} className="mt-3 h-1.5" />
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Course</th>
                <th className="px-4 py-3 text-left font-medium">Assessment</th>
                <th className="px-4 py-3 text-right font-medium">Score</th>
                <th className="px-4 py-3 text-right font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g) => (
                <tr key={g.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{g.course}</td>
                  <td className="px-4 py-3 text-muted-foreground">{g.assessment}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className="font-medium">{g.score}</span>
                    <span className="text-muted-foreground">/{g.maxScore}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {new Date(g.recordedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {grades.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                    No grades recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
