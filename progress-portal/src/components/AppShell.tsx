import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BriefcaseBusiness,
  BookOpenCheck,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  LogOut,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const teacherNav: NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/students", label: "Students", icon: Users },
  { to: "/my-courses", label: "My Courses", icon: LineChart },
  { to: "/assignments", label: "Assignments", icon: BookOpenCheck },
  { to: "/progress", label: "Progress", icon: LineChart },
];

const studentNav: NavItem[] = [
  { to: "/dashboard", label: "My Dashboard", icon: LayoutDashboard },
  { to: "/my-courses", label: "My Courses", icon: BookOpenCheck },
  { to: "/my-assignments", label: "Assignments", icon: BookOpenCheck },
  { to: "/my-grades", label: "Grades", icon: LineChart },
];

const adminNav: NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/admin", label: "Manage Faculty", icon: BriefcaseBusiness },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!user) return <>{children}</>;
  const nav =
    user.role === "teacher" ? teacherNav : user.role === "admin" ? adminNav : studentNav;

  const initials = user.fullName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gold text-gold-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-base leading-none">UniSphere</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
              {user.role === "teacher"
                ? "Faculty Portal"
                : user.role === "admin"
                  ? "Admin Portal"
                  : "Student Portal"}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          {nav.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-3 py-4">
          <div className="flex items-center gap-3 rounded-md bg-sidebar-accent/40 p-2">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-gold text-gold-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.fullName}</p>
              <p className="truncate text-xs text-sidebar-foreground/60">
                {user.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                logout();
                navigate({ to: "/login" });
              }}
              className="h-8 w-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card/60 px-6 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-display text-lg">UniSphere</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="h-8 w-8" />
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate({ to: "/login" }); }}>
              Sign out
            </Button>
          </div>
        </header>

        {api.isMock && (
          <div className="border-b border-gold/30 bg-gold/10 px-6 py-2 text-center text-xs text-gold-foreground/80">
            <Badge variant="outline" className="mr-2 border-gold/50 bg-gold/20 text-gold-foreground">
              Demo
            </Badge>
            Running on mock data — set <code className="font-mono">VITE_API_BASE_URL</code> to connect your backend.
          </div>
        )}

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-10">
          <div className="mb-4 hidden justify-end md:flex">
            <ThemeToggle />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
