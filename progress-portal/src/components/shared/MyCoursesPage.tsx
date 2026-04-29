import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BookOpen, Database, Network, Settings, Workflow } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function MyCoursesPage() {
  const { user } = useAuth();

  const studentProfileQ = useQuery({
    queryKey: ["student-profile", user?.email],
    queryFn: () => api.getStudentByEmail(user!.email),
    enabled: Boolean(user?.email) && user?.role === "student",
  });

  const myTeacherCoursesQ = useQuery({
    queryKey: ["my-courses"],
    queryFn: api.listMyCourses,
    enabled: user?.role === "teacher",
  });

  const branchCoursesQ = useQuery({
    queryKey: ["branch-courses", studentProfileQ.data?.branch],
    queryFn: () => api.getBranchCourses(studentProfileQ.data!.branch),
    enabled: Boolean(studentProfileQ.data?.branch) && user?.role === "student",
  });

  const assignmentsQ = useQuery({
    queryKey: ["assignments"],
    queryFn: api.listAssignments,
  });

  const submissionsQ = useQuery({
    queryKey: ["my-course-submissions", studentProfileQ.data?.id],
    queryFn: () => api.listSubmissions({ studentId: studentProfileQ.data!.id }),
    enabled: Boolean(studentProfileQ.data?.id) && user?.role === "student",
  });

  const courses =
    user?.role === "teacher"
      ? myTeacherCoursesQ.data ?? []
      : branchCoursesQ.data ?? [];
  const assignments = assignmentsQ.data ?? [];
  const submissions = submissionsQ.data ?? [];
  const courseLink = user?.role === "teacher" ? "/assignments" : "/my-assignments";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">My Courses</h1>
        <p className="text-sm text-muted-foreground">
          {user?.role === "teacher"
            ? "Courses you selected during registration."
            : "Courses assigned to your branch."}
        </p>
      </div>

      {courses.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">No courses found yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {courses.map((course) => {
            const courseAssignments = assignments.filter((a) => a.course === course);
            const completedCount =
              user?.role === "teacher"
                ? courseAssignments.filter((a) => a.status === "published" || a.status === "archived").length
                : courseAssignments.filter((a) =>
                    submissions.some((s) => s.assignmentId === a.id && s.status !== "pending"),
                  ).length;
            const completion =
              courseAssignments.length === 0
                ? 0
                : Math.round((completedCount / courseAssignments.length) * 100);

            return (
              <Card key={course} className="bg-gradient-to-b from-background to-muted/40 p-5 shadow-sm">
                <div className="flex h-full flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <h3 className="line-clamp-3 text-3xl font-semibold leading-tight">{course}</h3>
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CourseIcon course={course} className="h-7 w-7" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-muted-foreground">In Progress</span>
                        <span className="text-muted-foreground">{completion}% complete</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-border">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completion}%` }} />
                      </div>
                    </div>
                  </div>
                  <Button asChild variant="secondary" className="w-full">
                    <Link to={courseLink}>Continue Learning</Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CourseIcon({ course, className }: { course: string; className?: string }) {
  const text = course.toLowerCase();
  if (text.includes("database")) return <Database className={className} />;
  if (text.includes("network")) return <Network className={className} />;
  if (text.includes("operating")) return <Settings className={className} />;
  if (text.includes("software")) return <Workflow className={className} />;
  return <BookOpen className={className} />;
}

