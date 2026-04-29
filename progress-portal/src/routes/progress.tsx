import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { ProgressPage } from "@/components/teacher/ProgressPage";

export const Route = createFileRoute("/progress")({
  head: () => ({ meta: [{ title: "Class progress — UniSphere" }] }),
  component: ProgressRoute,
});

function ProgressRoute() {
  return (
    <RequireAuth role="teacher">
      <AppShell>
        <ProgressPage />
      </AppShell>
    </RequireAuth>
  );
}
