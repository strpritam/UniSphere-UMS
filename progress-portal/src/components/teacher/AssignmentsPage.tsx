import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "@/lib/api-client";
import type { Assignment, AssignmentStatus, Submission } from "@/lib/api-types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  course: z.string().trim().min(1).max(40),
  description: z.string().trim().max(2000),
  dueDate: z.string().min(1),
  maxScore: z.coerce.number().min(1).max(1000),
  status: z.enum(["draft", "published", "archived"]),
});

export function AssignmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const assignmentsQ = useQuery({ queryKey: ["assignments"], queryFn: api.listAssignments });
  const submissionsQ = useQuery({ queryKey: ["submissions"], queryFn: () => api.listSubmissions() });
  const studentsQ = useQuery({ queryKey: ["students"], queryFn: api.listStudents });
  const myCoursesQ = useQuery({
    queryKey: ["my-courses"],
    queryFn: api.listMyCourses,
    enabled: user?.role === "teacher" || user?.role === "admin",
  });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [status, setStatus] = useState<AssignmentStatus>("published");
  const [tab, setTab] = useState<"all" | AssignmentStatus>("all");

  const create = useMutation({
    mutationFn: api.createAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Assignment created");
      setOpen(false);
      setTitle(""); setCourse(""); setDescription(""); setDueDate(""); setMaxScore("100"); setStatus("published");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: api.deleteAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Assignment deleted");
    },
  });

  const assignments = assignmentsQ.data ?? [];
  const submissions = submissionsQ.data ?? [];
  const students = studentsQ.data ?? [];
  const myCourses = myCoursesQ.data ?? [];
  const isTeacher = user?.role === "teacher";
  const hasAssignedCourses = !isTeacher || myCourses.length > 0;

  const filtered = useMemo(
    () => (tab === "all" ? assignments : assignments.filter((a) => a.status === tab)),
    [assignments, tab],
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTeacher && !hasAssignedCourses) {
      toast.error("No courses assigned. Ask admin to assign a course to you first.");
      return;
    }
    const parsed = schema.safeParse({ title, course, description, dueDate, maxScore, status });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    create.mutate({
      ...parsed.data,
      dueDate: new Date(parsed.data.dueDate).toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Assignments</h1>
          <p className="text-sm text-muted-foreground">
            {assignments.length} total · {assignments.filter((a) => a.status === "published").length} live
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" /> New assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create assignment</DialogTitle>
              <DialogDescription>Publish to your students or save as a draft.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="course">Course</Label>
                  {isTeacher ? (
                    <Select
                      value={course}
                      onValueChange={(v) => setCourse(v)}
                      disabled={!hasAssignedCourses}
                    >
                      <SelectTrigger id="course" className="w-full">
                        <SelectValue placeholder={hasAssignedCourses ? "Select course" : "No courses assigned"} />
                      </SelectTrigger>
                      <SelectContent>
                        {myCourses.map((c) => (
                          <SelectItem key={c} value={c}>
                            {courseCode(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="course"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      placeholder="CS 201"
                      required
                    />
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dueDate">Due date</Label>
                  <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="maxScore">Max score</Label>
                  <Input id="maxScore" type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as AssignmentStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
            {isTeacher && !hasAssignedCourses && (
              <p className="mt-3 text-xs text-muted-foreground">
                You can’t create assignments until an admin assigns at least one course to your account in Admin → Assign course to teacher.
              </p>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-4">
          {filtered.length === 0 && (
            <Card className="p-12 text-center text-muted-foreground">
              No assignments here yet.
            </Card>
          )}
          {filtered.map((a) => (
            <AssignmentRow
              key={a.id}
              assignment={a}
              submissions={submissions.filter((s) => s.assignmentId === a.id)}
              studentCount={students.length}
              onDelete={() => {
                if (confirm(`Delete "${a.title}"?`)) remove.mutate(a.id);
              }}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function courseCode(course: string) {
  return course.split("-")[0]?.trim() || course;
}

function AssignmentRow({
  assignment,
  submissions,
  studentCount,
  onDelete,
}: {
  assignment: Assignment;
  submissions: Submission[];
  studentCount: number;
  onDelete: () => void;
}) {
  const due = new Date(assignment.dueDate);
  const overdue = due.getTime() < Date.now() && assignment.status === "published";
  const submitted = submissions.filter((s) => s.status !== "pending").length;
  const graded = submissions.filter((s) => s.status === "graded").length;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg">{assignment.title}</h3>
            <Badge variant="outline">{assignment.course}</Badge>
            <Badge
              className={
                assignment.status === "published"
                  ? "bg-success/15 text-success hover:bg-success/15"
                  : assignment.status === "draft"
                    ? "bg-muted text-muted-foreground hover:bg-muted"
                    : "bg-accent text-accent-foreground hover:bg-accent"
              }
            >
              {assignment.status}
            </Badge>
          </div>
          {assignment.description && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {assignment.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className={`inline-flex items-center gap-1 ${overdue ? "text-destructive" : ""}`}>
              <Calendar className="h-3.5 w-3.5" />
              Due {due.toLocaleDateString()}
            </span>
            <span>Max {assignment.maxScore} pts</span>
            <span>
              {submitted}/{studentCount} submitted · {graded} graded
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete">
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
    </Card>
  );
}
