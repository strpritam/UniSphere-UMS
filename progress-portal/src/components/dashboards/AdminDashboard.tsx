import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BookOpenCheck, UserRoundCog, Users } from "lucide-react";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

export function AdminDashboard() {
  const { user } = useAuth();
  const teachersQ = useQuery({ queryKey: ["teachers"], queryFn: api.listTeachers });
  const mappingsQ = useQuery({
    queryKey: ["course-assignments"],
    queryFn: api.listCourseAssignments,
  });
  const assignmentsQ = useQuery({ queryKey: ["assignments"], queryFn: api.listAssignments });

  const teachers = teachersQ.data ?? [];
  const mappings = mappingsQ.data ?? [];
  const assignments = assignmentsQ.data ?? [];
  const uniqueCourses = useMemo(
    () => Array.from(new Set(mappings.map((m) => m.course))).length,
    [mappings],
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="mt-1 font-display text-4xl">Welcome, {user?.fullName.split(" ")[0]}.</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Manage faculty accounts and keep course ownership clear across the portal.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat icon={Users} label="Teachers" value={teachers.length} />
        <Stat icon={BookOpenCheck} label="Assigned Courses" value={uniqueCourses} />
        <Stat icon={UserRoundCog} label="Course-Teacher Mappings" value={mappings.length} />
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Recent course mappings</h2>
          <Link to="/admin" className="text-sm font-medium text-primary hover:underline">
            Manage all
          </Link>
        </div>
        <div className="mt-4 space-y-2">
          {mappings.slice(0, 6).map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">{m.course}</p>
                <p className="text-xs text-muted-foreground">{m.teacherName ?? m.teacherEmail}</p>
              </div>
              <Badge variant="outline">Active</Badge>
            </div>
          ))}
          {mappings.length === 0 && (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              No courses assigned yet.
            </p>
          )}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Total assignments currently in system: {assignments.length}
        </p>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-display text-2xl">{value}</p>
        </div>
      </div>
    </Card>
  );
}
