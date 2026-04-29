import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { StudentsPage } from "@/components/teacher/StudentsPage";

export const Route = createFileRoute("/students")({
  head: () => ({ meta: [{ title: "Students — UniSphere" }] }),
  component: StudentsRoute,
});

function StudentsRoute() {
  return (
    <RequireAuth role="teacher">
      <AppShell>
        <StudentsPage />
      </AppShell>
    </RequireAuth>
  );
}
