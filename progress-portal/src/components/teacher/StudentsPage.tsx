import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Search } from "lucide-react";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function StudentsPage() {
  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: api.listStudents,
  });
  const [search, setSearch] = useState("");
  const [program, setProgram] = useState<string>("all");

  const programs = useMemo(
    () => Array.from(new Set(students.map((s) => s.program))).sort(),
    [students],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const matchesQ =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.studentNumber.toLowerCase().includes(q);
      const matchesProgram = program === "all" || s.program === program;
      return matchesQ && matchesProgram;
    });
  }, [students, search, program]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Students</h1>
          <p className="text-sm text-muted-foreground">
            {students.length} enrolled · {filtered.length} shown
          </p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or student number"
              className="pl-9"
            />
          </div>
          <Select value={program} onValueChange={setProgram}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All programs</SelectItem>
              {programs.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Student</th>
                <th className="px-4 py-3 text-left font-medium">ID</th>
                <th className="px-4 py-3 text-left font-medium">Program</th>
                <th className="px-4 py-3 text-left font-medium">Year</th>
                <th className="px-4 py-3 text-left font-medium">GPA</th>
                <th className="px-4 py-3 text-left font-medium">Attendance</th>
                <th className="px-4 py-3 text-right font-medium">Profile</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const initials = s.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("");
                return (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {s.studentNumber}
                    </td>
                    <td className="px-4 py-3">{s.program}</td>
                    <td className="px-4 py-3">{s.year}</td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          s.gpa >= 3.5
                            ? "bg-success/15 text-success hover:bg-success/15"
                            : s.gpa >= 3.0
                              ? "bg-primary/10 text-primary hover:bg-primary/10"
                              : "bg-warning/15 text-warning-foreground hover:bg-warning/15"
                        }
                      >
                        {s.gpa.toFixed(2)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={s.attendance} className="h-1.5 w-20" />
                        <span className="text-xs text-muted-foreground">{s.attendance}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          window.location.assign(`/student-profile/${encodeURIComponent(s.id)}`)
                        }
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        View <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No students match your search.
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
