import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, GraduationCap } from "lucide-react";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth-context";

export function StudentDashboard() {
  const { user } = useAuth();

  const studentQ = useQuery({
    queryKey: ["student-by-email", user?.email],
    queryFn: () => api.getStudentByEmail(user!.email),
    enabled: !!user,
  });
  const student = studentQ.data;

  const assignmentsQ = useQuery({ queryKey: ["assignments"], queryFn: api.listAssignments });
  const submissionsQ = useQuery({
    queryKey: ["my-submissions", student?.id],
    queryFn: () => api.listSubmissions({ studentId: student!.id }),
    enabled: !!student,
  });
  const gradesQ = useQuery({
    queryKey: ["my-grades", student?.id],
    queryFn: () => api.listGrades(student!.id),
    enabled: !!student,
  });

  const assignments = assignmentsQ.data ?? [];
  const submissions = submissionsQ.data ?? [];
  const grades = gradesQ.data ?? [];

  const upcoming = useMemo(
    () =>
      assignments
        .filter((a) => a.status === "published" && new Date(a.dueDate) > new Date())
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 4),
    [assignments],
  );

  const completed = submissions.filter((s) => s.status === "graded" || s.status === "submitted").length;
  const totalPublished = assignments.filter((a) => a.status === "published").length;
  const completionRate = totalPublished === 0 ? 0 : (completed / totalPublished) * 100;
  const initials = user?.fullName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const uniqueCourses = new Set(assignments.map((a) => a.course)).size;
  const gradedCount = submissions.filter((s) => s.status === "graded").length;
  const submittedCount = submissions.filter((s) => s.status === "submitted").length;
  const targetGpa = Math.max(3.2, student?.gpa ?? 0).toFixed(2);
  const recentGrades = grades.slice(0, 3);

  return (
    <div className="space-y-5">
      <Card className="border-border/60 bg-gradient-to-r from-card to-primary/5 p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xl font-semibold text-primary">
              {initials || "ST"}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-3xl">{user?.fullName}</h1>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {student?.studentNumber && <Badge variant="secondary">{student.studentNumber}</Badge>}
                {student?.program && <Badge variant="secondary">{student.program}</Badge>}
                {student?.year && <Badge variant="secondary">Year {student.year}</Badge>}
                {student?.enrolledAt && (
                  <Badge variant="secondary">
                    Enrolled {new Date(student.enrolledAt).toLocaleDateString()}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Card className="min-w-28 border-border/70 bg-background/70 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">GPA</p>
              <p className="font-display text-3xl">{student?.gpa.toFixed(2) ?? "0.00"}</p>
            </Card>
            <Card className="min-w-28 border-border/70 bg-background/70 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Attendance</p>
              <p className="font-display text-3xl">{student?.attendance ?? 0}%</p>
            </Card>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-3 border-border/70 bg-card/80 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Grade Summary</h2>
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">Current GPA</p>
          <p className="font-display text-6xl">{student?.gpa.toFixed(2) ?? "0.00"}</p>
          <div className="mt-4 rounded-md border border-border/60 bg-background/40 p-3">
            <p className="text-sm font-medium">Grades</p>
            <p className="text-xs text-muted-foreground">{grades.length} records</p>
            {recentGrades.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No grades yet.</p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-sm">
                {recentGrades.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-muted-foreground">{g.assessment}</span>
                    <span className="font-medium">{g.score}/{g.maxScore}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="xl:col-span-3 border-border/70 bg-card/80 p-5">
          <h2 className="font-display text-2xl">Progress</h2>
          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Attendance</span>
                <span className="font-semibold">{student?.attendance ?? 0}%</span>
              </div>
              <Progress value={student?.attendance ?? 0} className="h-2" />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Assignment Completion</span>
                <span className="font-semibold">{completionRate.toFixed(0)}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-3 border-border/70 bg-card/80 p-5">
          <h2 className="font-display text-2xl">Academic Standing</h2>
          <div className="mt-6 text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current level</p>
            <p className="font-display text-6xl">Year {student?.year ?? 1}</p>
          </div>
        </Card>

        <Card className="xl:col-span-3 border-border/70 bg-card/80 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Upcoming</h2>
            <CalendarClock className="h-5 w-5 text-primary" />
          </div>
          <ul className="mt-4 space-y-2.5">
            {upcoming.length === 0 && (
              <li className="rounded-md border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
                No upcoming deadlines.
              </li>
            )}
            {upcoming.map((a) => (
              <li key={a.id} className="rounded-md border border-border/70 bg-background/40 p-3">
                <p className="truncate text-sm font-medium">{a.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.course}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Due {new Date(a.dueDate).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="xl:col-span-5 border-border/70 bg-card/80 p-5">
          <h2 className="font-display text-2xl">Assignment Activity</h2>
          <p className="text-sm text-muted-foreground">Activity ({submissions.length} submissions)</p>
          <div className="mt-4 rounded-md border border-border/60 bg-background/40 p-3">
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">{submittedCount}</span> awaiting grade
                </p>
                <p>
                  <span className="font-medium">{gradedCount}</span> graded submissions
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="xl:col-span-2 border-border/70 bg-card/80 p-5">
          <h2 className="font-display text-2xl">Current Courses</h2>
          <p className="mt-2 text-5xl font-display">{uniqueCourses}</p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">active courses</p>
        </Card>

        <Card className="xl:col-span-2 border-border/70 bg-card/80 p-5">
          <h2 className="font-display text-2xl">Target GPA</h2>
          <p className="mt-2 font-display text-5xl">{targetGpa}</p>
        </Card>

        <Card className="xl:col-span-3 border-border/70 bg-card/80 p-5">
          <h2 className="font-display text-2xl">Past Semesters</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Summary currently unavailable. Historical records will appear here.
          </p>
        </Card>
      </div>
    </div>
  );
}
