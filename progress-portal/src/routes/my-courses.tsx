import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { MyCoursesPage } from "@/components/shared/MyCoursesPage";

export const Route = createFileRoute("/my-courses")({
  head: () => ({ meta: [{ title: "My Courses — UniSphere" }] }),
  component: MyCoursesRoute,
});

function MyCoursesRoute() {
  return (
    <RequireAuth>
      <AppShell>
        <MyCoursesPage />
      </AppShell>
    </RequireAuth>
  );
}

