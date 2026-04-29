import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, CheckCircle2, Clock, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";

export function MyAssignmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const submit = useMutation({
    mutationFn: ({
      assignmentId,
      studentId,
      content,
    }: {
      assignmentId: string;
      studentId: string;
      content?: string;
    }) => api.submitAssignment(assignmentId, studentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-submissions", student?.id] });
      toast.success("Submitted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!student) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const assignments = (assignmentsQ.data ?? []).filter((a) => a.status === "published");
  const submissions = submissionsQ.data ?? [];
  const subBy = (id: string) => submissions.find((s) => s.assignmentId === id);
  const [draftContentByAssignment, setDraftContentByAssignment] = useState<Record<string, string>>({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">My assignments</h1>
        <p className="text-sm text-muted-foreground">Submit your work and track feedback</p>
      </div>

      <div className="space-y-4">
        {assignments.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground">
            No assignments published yet.
          </Card>
        )}
        {assignments.map((a) => {
          const sub = subBy(a.id);
          const due = new Date(a.dueDate);
          const overdue = due.getTime() < Date.now();
          const submitted = sub?.status === "submitted" || sub?.status === "graded";

          return (
            <Card key={a.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg">{a.title}</h3>
                    <Badge variant="outline">{a.course}</Badge>
                    {sub?.status === "graded" && (
                      <Badge className="bg-success/15 text-success hover:bg-success/15">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {sub.score}/{a.maxScore}
                      </Badge>
                    )}
                    {sub?.status === "submitted" && (
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                        Awaiting grade
                      </Badge>
                    )}
                    {!sub && overdue && (
                      <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/15">
                        Overdue
                      </Badge>
                    )}
                  </div>
                  {a.description && (
                    <p className="mt-2 text-sm text-muted-foreground">{a.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className={`inline-flex items-center gap-1 ${overdue && !submitted ? "text-destructive" : ""}`}>
                      <Calendar className="h-3.5 w-3.5" />
                      Due {due.toLocaleDateString()}
                    </span>
                    <span>{a.maxScore} pts</span>
                  </div>
                  {sub?.feedback && (
                    <div className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-sm">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Feedback
                      </p>
                      <p className="mt-1">{sub.feedback}</p>
                    </div>
                  )}
                  {!submitted && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Submission content
                      </p>
                      <Textarea
                        rows={4}
                        placeholder="Add your answer, notes, or a link to your work..."
                        value={draftContentByAssignment[a.id] ?? ""}
                        onChange={(e) =>
                          setDraftContentByAssignment((prev) => ({
                            ...prev,
                            [a.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}
                  {sub?.content && (
                    <div className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-sm">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Your submission
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{sub.content}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {submitted ? (
                    <Badge variant="outline" className="border-success/40 text-success">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Submitted
                    </Badge>
                  ) : (
                    <Button
                      onClick={() =>
                        submit.mutate({
                          assignmentId: a.id,
                          studentId: student.id,
                          content: draftContentByAssignment[a.id],
                        })
                      }
                      disabled={submit.isPending}
                    >
                      {submit.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Submit
                    </Button>
                  )}
                  {sub?.submittedAt && (
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
