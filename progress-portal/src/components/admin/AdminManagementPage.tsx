import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Branch, Student } from "@/lib/api-types";
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

export function AdminManagementPage() {
  const queryClient = useQueryClient();
  const studentsQ = useQuery({ queryKey: ["students"], queryFn: api.listStudents });
  const branchesQ = useQuery({ queryKey: ["branches"], queryFn: api.listBranches });

  const [branch, setBranch] = useState<Branch>("CSE");
  const [courses, setCourses] = useState<string[]>(["", "", "", "", "", ""]);

  const branchLabel: Record<Branch, string> = useMemo(
    () => ({
      CSE: "Computer Science and Engineering",
      BBA: "Bachelor of Business Administration",
      Agriculture: "Agriculture",
      Mechanicals: "Mechanical Engineering",
    }),
    [],
  );

  const saveBranchCourses = useMutation({
    mutationFn: (input: { branch: Branch; courses: string[] }) =>
      api.updateBranchCourses(input.branch, input.courses),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch courses saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const students = studentsQ.data ?? [];
  const branchMap = useMemo(() => {
    const list = branchesQ.data ?? [];
    return new Map(list.map((b) => [b.branch, b.courses]));
  }, [branchesQ.data]);

  useEffect(() => {
    const list = branchMap.get(branch);
    if (list && list.length === 6) setCourses(list);
  }, [branch, branchMap]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Admin</h1>
        <p className="text-sm text-muted-foreground">Manage branch courses and student records.</p>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl">Branches & courses</h2>
            <p className="text-sm text-muted-foreground">
              Each branch must have exactly 6 courses. Students automatically get all courses from their branch.
            </p>
          </div>
          <div className="min-w-[220px]">
            <Label>Branch</Label>
            <Select value={branch} onValueChange={(v) => setBranch(v as Branch)}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CSE">{branchLabel.CSE}</SelectItem>
                <SelectItem value="BBA">{branchLabel.BBA}</SelectItem>
                <SelectItem value="Agriculture">{branchLabel.Agriculture}</SelectItem>
                <SelectItem value="Mechanicals">{branchLabel.Mechanicals}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {courses.map((c, idx) => (
            <div key={idx} className="grid gap-2">
              <Label htmlFor={`course-${idx}`}>Course {idx + 1}</Label>
              <Input
                id={`course-${idx}`}
                value={c}
                onChange={(e) => {
                  const next = [...courses];
                  next[idx] = e.target.value;
                  setCourses(next);
                }}
                placeholder="e.g. CSE 101"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            onClick={() => {
              const trimmed = courses.map((x) => x.trim()).filter(Boolean);
              if (trimmed.length !== 6) {
                toast.error("Please fill all 6 courses");
                return;
              }
              saveBranchCourses.mutate({ branch, courses: courses.map((x) => x.trim()) });
            }}
            disabled={saveBranchCourses.isPending}
          >
            {saveBranchCourses.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div />
      </div>

      <Card className="p-6">
        <h2 className="font-display text-xl">Teachers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Teachers register themselves with OTP and select up to 3 courses from their branch.
        </p>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-xl">Students</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update details for newly registered students (program, year, GPA, attendance).
        </p>
        <div className="mt-4 space-y-2">
          {students.map((s) => (
            <StudentRow
              key={s.id}
              student={s}
              onSave={async (patch) => {
                await api.updateStudent(s.id, patch);
                queryClient.invalidateQueries({ queryKey: ["students"] });
              }}
            />
          ))}
          {students.length === 0 && (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              No students found yet.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function StudentRow({
  student,
  onSave,
}: {
  student: Student;
  onSave: (patch: Partial<Pick<Student, "program" | "year" | "gpa" | "attendance" | "studentNumber">>) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [studentNumber, setStudentNumber] = useState(student.studentNumber);
  const [program, setProgram] = useState(student.program);
  const [year, setYear] = useState(String(student.year));
  const [gpa, setGpa] = useState(String(student.gpa));
  const [attendance, setAttendance] = useState(String(student.attendance));
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
      <div>
        <p className="text-sm font-medium">{student.fullName}</p>
        <p className="text-xs text-muted-foreground">{student.email}</p>
      </div>
      <div className="flex items-center gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Edit3 className="mr-2 h-3.5 w-3.5" />
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit student</DialogTitle>
              <DialogDescription>Update student details saved in the database.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor={`sn-${student.id}`}>Student ID</Label>
                <Input
                  id={`sn-${student.id}`}
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`program-${student.id}`}>Program</Label>
                <Input
                  id={`program-${student.id}`}
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor={`year-${student.id}`}>Year</Label>
                  <Input
                    id={`year-${student.id}`}
                    type="number"
                    min={1}
                    max={10}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`gpa-${student.id}`}>GPA</Label>
                  <Input
                    id={`gpa-${student.id}`}
                    type="number"
                    step="0.01"
                    min={0}
                    max={10}
                    value={gpa}
                    onChange={(e) => setGpa(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`att-${student.id}`}>Attendance %</Label>
                  <Input
                    id={`att-${student.id}`}
                    type="number"
                    min={0}
                    max={100}
                    value={attendance}
                    onChange={(e) => setAttendance(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const parsedYear = Number(year);
                    const parsedGpa = Number(gpa);
                    const parsedAttendance = Number(attendance);
                    if (!Number.isFinite(parsedYear) || parsedYear < 1 || parsedYear > 10) {
                      throw new Error("Year must be between 1 and 10");
                    }
                    if (!Number.isFinite(parsedGpa) || parsedGpa < 0 || parsedGpa > 10) {
                      throw new Error("GPA must be between 0 and 10");
                    }
                    if (!Number.isFinite(parsedAttendance) || parsedAttendance < 0 || parsedAttendance > 100) {
                      throw new Error("Attendance must be between 0 and 100");
                    }
                    await onSave({
                      studentNumber,
                      program,
                      year: parsedYear,
                      gpa: parsedGpa,
                      attendance: parsedAttendance,
                    });
                    toast.success("Student updated");
                    setOpen(false);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Update failed");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
