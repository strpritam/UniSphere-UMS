import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const gradeSchema = z.object({
  course: z.string().trim().min(1).max(40),
  assessment: z.string().trim().min(1).max(80),
  score: z.coerce.number().min(0).max(1000),
  maxScore: z.coerce.number().min(1).max(1000),
});

export function StudentDetailPage({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  const studentQ = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => api.getStudent(studentId),
  });
  const gradesQ = useQuery({
    queryKey: ["grades", studentId],
    queryFn: () => api.listGrades(studentId),
  });
  const submissionsQ = useQuery({
    queryKey: ["submissions", "student", studentId],
    queryFn: () => api.listSubmissions({ studentId }),
  });
  const assignmentsQ = useQuery({
    queryKey: ["assignments"],
    queryFn: api.listAssignments,
  });

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [course, setCourse] = useState("");
  const [assessment, setAssessment] = useState("");
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("100");

  const addGrade = useMutation({
    mutationFn: api.addGrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades", studentId] });
      toast.success("Grade recorded");
      setOpen(false);
      setAssessment(""); setScore("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateGrade = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { course: string; assessment: string; score: number; maxScore: number } }) =>
      api.updateGrade(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades", studentId] });
      toast.success("Grade updated");
      setEditOpen(false);
      setEditingGradeId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (studentQ.isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  const student = studentQ.data;
  if (!student) return <p className="text-muted-foreground">Student not found.</p>;

  const initials = student.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const grades = gradesQ.data ?? [];
  const submissions = submissionsQ.data ?? [];
  const assignments = assignmentsQ.data ?? [];

  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = gradeSchema.safeParse({ course, assessment, score, maxScore });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    addGrade.mutate({ studentId, ...parsed.data });
  };

  const handleEditGrade = (gradeId: string) => {
    const target = grades.find((g) => g.id === gradeId);
    if (!target) return;
    setEditingGradeId(gradeId);
    setCourse(target.course);
    setAssessment(target.assessment);
    setScore(String(target.score));
    setMaxScore(String(target.maxScore));
    setEditOpen(true);
  };

  const handleUpdateGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGradeId) return;
    const parsed = gradeSchema.safeParse({ course, assessment, score, maxScore });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    updateGrade.mutate({ id: editingGradeId, payload: parsed.data });
  };

  return (
    <div className="space-y-6">
      <Link to="/students" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to students
      </Link>

      <Card className="p-6">
        <div className="flex flex-wrap items-start gap-6">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-gradient-primary text-xl font-semibold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="font-display text-3xl">{student.fullName}</h1>
            <p className="text-muted-foreground">{student.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">{student.studentNumber}</Badge>
              <Badge variant="outline">{student.program}</Badge>
              <Badge variant="outline">Year {student.year}</Badge>
              <Badge variant="outline">
                Enrolled {new Date(student.enrolledAt).toLocaleDateString()}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <Stat label="GPA" value={student.gpa.toFixed(2)} />
            <Stat label="Attendance" value={`${student.attendance}%`} />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl">Grades</h2>
              <p className="text-sm text-muted-foreground">{grades.length} records</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Add grade
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record a new grade</DialogTitle>
                  <DialogDescription>
                    Add a new graded assessment for {student.fullName}.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddGrade} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="course">Course</Label>
                    <Input id="course" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="CS 201" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="assessment">Assessment</Label>
                    <Input id="assessment" value={assessment} onChange={(e) => setAssessment(e.target.value)} placeholder="Midterm Exam" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="score">Score</Label>
                      <Input id="score" type="number" value={score} onChange={(e) => setScore(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="maxScore">Out of</Label>
                      <Input id="maxScore" type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} required />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={addGrade.isPending}>
                      {addGrade.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save grade
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-2">
            {grades.length === 0 && (
              <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                No grades yet.
              </p>
            )}
            {grades.map((g) => {
              const pct = (g.score / g.maxScore) * 100;
              return (
                <div key={g.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{g.assessment}</p>
                      <p className="text-xs text-muted-foreground">{g.course}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm">
                        <span className="font-semibold">{g.score}</span>
                        <span className="text-muted-foreground">/{g.maxScore}</span>
                      </p>
                      <Button variant="ghost" size="icon" onClick={() => handleEditGrade(g.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Progress value={pct} className="mt-2 h-1.5" />
                </div>
              );
            })}
          </div>
        </Card>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit grade</DialogTitle>
              <DialogDescription>Update score or details for this grade entry.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateGrade} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-course">Course</Label>
                <Input id="edit-course" value={course} onChange={(e) => setCourse(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-assessment">Assessment</Label>
                <Input id="edit-assessment" value={assessment} onChange={(e) => setAssessment(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="edit-score">Score</Label>
                  <Input id="edit-score" type="number" value={score} onChange={(e) => setScore(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-maxScore">Out of</Label>
                  <Input id="edit-maxScore" type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} required />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateGrade.isPending}>
                  {updateGrade.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update grade
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Card className="p-6">
          <h2 className="font-display text-xl">Assignment activity</h2>
          <p className="text-sm text-muted-foreground">{submissions.length} submissions</p>
          <div className="mt-4 space-y-2">
            {submissions.length === 0 && (
              <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                No submissions yet.
              </p>
            )}
            {submissions.map((s) => {
              const a = assignments.find((x) => x.id === s.assignmentId);
              return (
                <div key={s.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a?.title ?? "Assignment"}</p>
                    <p className="text-xs text-muted-foreground">{a?.course}</p>
                  </div>
                  <Badge
                    className={
                      s.status === "graded"
                        ? "bg-success/15 text-success hover:bg-success/15"
                        : s.status === "submitted"
                          ? "bg-primary/10 text-primary hover:bg-primary/10"
                          : "bg-warning/15 text-warning-foreground hover:bg-warning/15"
                    }
                  >
                    {s.status === "graded" && a ? `${s.score}/${a.maxScore}` : s.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-center">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-2xl">{value}</p>
    </div>
  );
}
