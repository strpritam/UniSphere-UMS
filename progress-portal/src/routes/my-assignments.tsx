import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { MyAssignmentsPage } from "@/components/student/MyAssignmentsPage";

export const Route = createFileRoute("/my-assignments")({
  head: () => ({ meta: [{ title: "My assignments — UniSphere" }] }),
  component: MyAssignmentsRoute,
});

function MyAssignmentsRoute() {
  return (
    <RequireAuth role="student">
      <AppShell>
        <MyAssignmentsPage />
      </AppShell>
    </RequireAuth>
  );
}
