import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — UniSphere" },
      { name: "description", content: "Sign in to your UniSphere portal." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(128),
});
const forgotEmailSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
});
const otpSchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, "Enter 6-digit OTP"),
});
const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "At least 6 characters").max(128),
    confirmPassword: z.string().min(6, "At least 6 characters").max(128),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type ForgotStep = "login" | "requestOtp" | "verifyOtp" | "resetPassword";

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  useEffect(() => {
    if (!otpExpiresAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [otpExpiresAt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    try {
      await login(parsed.data.email, parsed.data.password);
      toast.success("Welcome back");
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = forgotEmailSchema.safeParse({ email: forgotEmail });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    try {
      await api.requestPasswordResetOtp(parsed.data.email);
      toast.success("OTP sent to your email");
      setForgotEmail(parsed.data.email);
      setOtpExpiresAt(Date.now() + 60_000);
      setForgotStep("verifyOtp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = otpSchema.safeParse({ otp });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid OTP");
      return;
    }
    setSubmitting(true);
    try {
      await api.verifyPasswordResetOtp(forgotEmail, parsed.data.otp);
      toast.success("OTP verified");
      setForgotStep("resetPassword");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  const secondsLeft = otpExpiresAt ? Math.max(0, Math.ceil((otpExpiresAt - now) / 1000)) : 0;
  const canResend = forgotStep === "verifyOtp" && secondsLeft === 0 && Boolean(forgotEmail);

  const handleResendOtp = async () => {
    if (!forgotEmail) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.requestPasswordResetOtp(forgotEmail);
      toast.success("OTP resent");
      setOtp("");
      setOtpExpiresAt(Date.now() + 60_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = resetPasswordSchema.safeParse({
      password: newPassword,
      confirmPassword: confirmNewPassword,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid password");
      return;
    }
    setSubmitting(true);
    try {
      await api.resetPassword(forgotEmail, otp, parsed.data.password);
      toast.success("Password updated. Please sign in.");
      setForgotStep("login");
      setPassword("");
      setEmail(forgotEmail);
      setOtp("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-hero p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gold text-gold-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-display text-2xl">UniSphere</span>
        </div>
        <div className="relative z-10 max-w-lg">
          <h1 className="font-display text-5xl leading-[1.05] text-balance">
            One workspace for the entire academic life.
          </h1>
          <p className="mt-6 text-lg text-primary-foreground/75">
            Track student progress, manage assignments, and unify grades —
            built for universities that move with intention.
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-6 text-sm">
          <Stat value="12k+" label="Students" />
          <Stat value="340" label="Courses" />
          <Stat value="98%" label="Retention" />
        </div>
        <div className="pointer-events-none absolute -right-32 -top-24 h-[420px] w-[420px] rounded-full bg-gold/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-[360px] w-[360px] rounded-full bg-primary-glow/30 blur-3xl" />
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md border-border/70 p-8 shadow-elegant">
          <div className="lg:hidden">
            <div className="mb-6 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="font-display text-xl">UniSphere</span>
            </div>
          </div>
          <h2 className="font-display text-3xl">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to continue to your portal.
          </p>

          {forgotStep === "login" && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
              <button
                type="button"
                className="w-full text-sm text-primary hover:underline"
                onClick={() => {
                  setError(null);
                  setForgotStep("requestOtp");
                }}
              >
                Forgot password?
              </button>
            </form>
          )}

          {forgotStep === "requestOtp" && (
            <form onSubmit={handleRequestOtp} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="forgotEmail">Registered email</Label>
                <Input
                  id="forgotEmail"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send OTP
              </Button>
              <button
                type="button"
                className="w-full text-sm text-primary hover:underline"
                onClick={() => {
                  setError(null);
                  setOtpExpiresAt(null);
                  setForgotStep("login");
                }}
              >
                Back to login
              </button>
            </form>
          )}

          {forgotStep === "verifyOtp" && (
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
                Verify OTP
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={submitting || !canResend}
                onClick={handleResendOtp}
              >
                Resend OTP {secondsLeft > 0 ? `(${secondsLeft}s)` : ""}
              </Button>
            </form>
          )}

          {forgotStep === "resetPassword" && (
            <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmNewPassword">Confirm password</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save new password
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-3xl text-gold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-primary-foreground/60">
        {label}
      </p>
    </div>
  );
}
