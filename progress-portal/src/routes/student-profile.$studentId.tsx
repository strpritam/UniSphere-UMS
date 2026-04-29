import { createFileRoute, useParams } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { StudentDetailPage } from "@/components/teacher/StudentDetailPage";

export const Route = createFileRoute("/student-profile/$studentId")({
  head: () => ({ meta: [{ title: "Student profile — UniSphere" }] }),
  component: StudentProfileRoute,
});

function StudentProfileRoute() {
  const { studentId } = useParams({ from: "/student-profile/$studentId" });
  return (
    <RequireAuth role="teacher">
      <AppShell>
        <StudentDetailPage studentId={studentId} />
      </AppShell>
    </RequireAuth>
  );
}
