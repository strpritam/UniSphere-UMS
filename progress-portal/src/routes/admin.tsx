import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { AdminManagementPage } from "@/components/admin/AdminManagementPage";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — UniSphere" }] }),
  component: AdminRoute,
});

function AdminRoute() {
  return (
    <RequireAuth role="admin">
      <AppShell>
        <AdminManagementPage />
      </AppShell>
    </RequireAuth>
  );
}
