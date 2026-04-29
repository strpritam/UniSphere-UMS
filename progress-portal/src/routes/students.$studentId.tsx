import { createFileRoute, useParams } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { StudentDetailPage } from "@/components/teacher/StudentDetailPage";

export const Route = createFileRoute("/students/$studentId")({
  head: () => ({ meta: [{ title: "Student profile — UniSphere" }] }),
  component: StudentDetailRoute,
});

function StudentDetailRoute() {
  const { studentId } = useParams({ from: "/students/$studentId" });
  return (
    <RequireAuth role="teacher">
      <AppShell>
        <StudentDetailPage studentId={studentId} />
      </AppShell>
    </RequireAuth>
  );
}
