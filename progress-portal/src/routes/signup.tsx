import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import type { Branch, Role } from "@/lib/api-types";
import { ThemeToggle } from "@/components/ThemeToggle";

const BRANCH_LABEL: Record<Branch, string> = {
  CSE: "Computer Science and Engineering",
  BBA: "Bachelor of Business Administration",
  Agriculture: "Agriculture",
  Mechanicals: "Mechanical Engineering",
};

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — UniSphere" },
      { name: "description", content: "Create your UniSphere account." },
    ],
  }),
  component: SignupPage,
});

const baseSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(128),
  role: z.enum(["teacher", "student"]),
  branch: z.enum(["CSE", "BBA", "Agriculture", "Mechanicals"]),
});
const studentSchema = baseSchema.extend({
  role: z.literal("student"),
  year: z.coerce.number().int().min(1).max(10),
});
const teacherSchema = baseSchema.extend({
  role: z.literal("teacher"),
  courses: z.array(z.string()).min(1, "Select at least 1 course").max(3, "Select up to 3 courses"),
});

type Step = "details" | "otp";

function SignupPage() {
  const { user, requestRegistrationOtp, verifyRegistrationOtp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Exclude<Role, "admin">>("student");
  const [branch, setBranch] = useState<Branch>("CSE");
  const [year, setYear] = useState("1");
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [step, setStep] = useState<Step>("details");
  const [otp, setOtp] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRegistrationPayload, setPendingRegistrationPayload] = useState<
    | { role: "student"; fullName: string; email: string; password: string; branch: Branch; year: number }
    | { role: "teacher"; fullName: string; email: string; password: string; branch: Branch; courses: string[] }
    | null
  >(null);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  useEffect(() => {
    if (!otpExpiresAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [otpExpiresAt]);

  useEffect(() => {
    api
      .getBranchCourses(branch)
      .then((courses) => {
        setAvailableCourses(courses);
        setSelectedCourses((prev) => prev.filter((c) => courses.includes(c)).slice(0, 3));
      })
      .catch(() => {
        setAvailableCourses([]);
        setSelectedCourses([]);
      });
  }, [branch]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed =
      role === "student"
        ? studentSchema.safeParse({ fullName, email, password, role, branch, year })
        : teacherSchema.safeParse({ fullName, email, password, role, branch, courses: selectedCourses });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    try {
      setPendingRegistrationPayload(parsed.data);
      await requestRegistrationOtp(parsed.data);
      toast.success("OTP sent to your email");
      setOtpExpiresAt(Date.now() + 60_000);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = z.string().trim().regex(/^\d{6}$/, "Enter 6-digit OTP").safeParse(otp);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid OTP");
      return;
    }
    setSubmitting(true);
    try {
      await verifyRegistrationOtp(email, parsed.data);
      toast.success("Account created");
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  const secondsLeft = otpExpiresAt ? Math.max(0, Math.ceil((otpExpiresAt - now) / 1000)) : 0;
  const canResend = step === "otp" && secondsLeft === 0 && Boolean(pendingRegistrationPayload);

  const handleResend = async () => {
    if (!pendingRegistrationPayload) return;
    setError(null);
    setSubmitting(true);
    try {
      await requestRegistrationOtp(pendingRegistrationPayload);
      toast.success("OTP resent");
      setOtp("");
      setOtpExpiresAt(Date.now() + 60_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md border-border/70 p-8 shadow-elegant">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-display text-xl">UniSphere</span>
        </div>
        <h2 className="font-display text-3xl">Create your account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Register with OTP verification.
        </p>

        {step === "details" && (
          <form onSubmit={handleRequestOtp} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Gmail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>I am a</Label>
              <RadioGroup
                value={role}
                onValueChange={(v) => setRole(v as Exclude<Role, "admin">)}
                className="grid grid-cols-2 gap-3"
              >
                <Label
                  htmlFor="role-student"
                  className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm transition-colors ${
                    role === "student"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <RadioGroupItem id="role-student" value="student" />
                  Student
                </Label>
                <Label
                  htmlFor="role-teacher"
                  className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm transition-colors ${
                    role === "teacher"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <RadioGroupItem id="role-teacher" value="teacher" />
                  Teacher
                </Label>
              </RadioGroup>
            </div>

            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Select value={branch} onValueChange={(v) => setBranch(v as Branch)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CSE">{BRANCH_LABEL.CSE}</SelectItem>
                  <SelectItem value="BBA">{BRANCH_LABEL.BBA}</SelectItem>
                  <SelectItem value="Agriculture">{BRANCH_LABEL.Agriculture}</SelectItem>
                  <SelectItem value="Mechanicals">{BRANCH_LABEL.Mechanicals}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === "student" ? (
              <div className="space-y-1.5">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  min={1}
                  max={10}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Select up to 3 courses</Label>
                <div className="grid gap-2 rounded-md border border-border p-3">
                  {availableCourses.length === 0 && (
                    <p className="text-sm text-muted-foreground">No courses configured for this branch yet.</p>
                  )}
                  {availableCourses.map((c) => {
                    const checked = selectedCourses.includes(c);
                    const disabled = !checked && selectedCourses.length >= 3;
                    return (
                      <label key={c} className={`flex items-center gap-2 text-sm ${disabled ? "opacity-60" : ""}`}>
                        <Checkbox
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={(v) => {
                            const next = Boolean(v);
                            setSelectedCourses((prev) =>
                              next ? [...prev, c].slice(0, 3) : prev.filter((x) => x !== c),
                            );
                          }}
                        />
                        {c}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send OTP
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="otp">Enter OTP</Label>
              <Input
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code"
                required
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {secondsLeft > 0 ? `OTP expires in ${secondsLeft}s` : "OTP expired. Please resend."}
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & create account
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={submitting || !canResend}
              onClick={handleResend}
            >
              Resend OTP {secondsLeft > 0 ? `(${secondsLeft}s)` : ""}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setStep("details");
                setOtp("");
                setOtpExpiresAt(null);
                setError(null);
              }}
            >
              Back
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
