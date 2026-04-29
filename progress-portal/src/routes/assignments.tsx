import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { AssignmentsPage } from "@/components/teacher/AssignmentsPage";

export const Route = createFileRoute("/assignments")({
  head: () => ({ meta: [{ title: "Assignments — UniSphere" }] }),
  component: AssignmentsRoute,
});

function AssignmentsRoute() {
  return (
    <RequireAuth role="teacher">
      <AppShell>
        <AssignmentsPage />
      </AppShell>
    </RequireAuth>
  );
}
