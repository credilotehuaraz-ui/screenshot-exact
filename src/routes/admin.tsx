import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, Users, FileBarChart } from "lucide-react";
import { BottomNav, FullLoader, MobileShell } from "@/components/app/primitives";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administrador · Control Cabify" },
      { name: "description", content: "Panel de producción, conductores y liquidaciones." },
      { property: "og:title", content: "Administrador · Control Cabify" },
      { property: "og:description", content: "Panel de producción, conductores y liquidaciones." },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { hydrated, session } = useApp();
  const navigate = useNavigate();
  const ok = session?.role === "admin";
  useEffect(() => {
    if (hydrated && !ok) navigate({ to: "/" });
  }, [hydrated, ok, navigate]);
  if (!hydrated || !ok) return <FullLoader />;
  return (
    <MobileShell
      nav={
        <BottomNav
          items={[
            { to: "/admin", label: "Panel", icon: LayoutDashboard, exact: true },
            { to: "/admin/conductores", label: "Conductores", icon: Users },
            { to: "/admin/informes", label: "Informes", icon: FileBarChart },
          ]}
        />
      }
    >
      <Outlet />
    </MobileShell>
  );
}
