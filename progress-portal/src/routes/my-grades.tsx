import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { MyGradesPage } from "@/components/student/MyGradesPage";

export const Route = createFileRoute("/my-grades")({
  head: () => ({ meta: [{ title: "My grades — UniSphere" }] }),
  component: MyGradesRoute,
});

function MyGradesRoute() {
  return (
    <RequireAuth role="student">
      <AppShell>
        <MyGradesPage />
      </AppShell>
    </RequireAuth>
  );
}
