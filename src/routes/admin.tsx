import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, CalendarDays, Users, FileBarChart, ShieldCheck } from "lucide-react";
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
  const ok = session?.role === "admin" || session?.role === "superadmin";
  const isSuper = session?.role === "superadmin";

  useEffect(() => {
    if (hydrated && !ok) navigate({ to: "/" });
  }, [hydrated, ok, navigate]);

  if (!hydrated || !ok) return <FullLoader />;

  const navItems = [
    { to: "/admin" as const, label: "Panel", icon: LayoutDashboard, exact: true },
    { to: "/admin/historial" as const, label: "Historial", icon: CalendarDays },
    { to: "/admin/conductores" as const, label: "Conductores", icon: Users },
    ...(isSuper ? [{ to: "/admin/administradores" as const, label: "Admins", icon: ShieldCheck }] : []),
    { to: "/admin/informes" as const, label: "Informes", icon: FileBarChart },
  ];

  return (
    <MobileShell nav={<BottomNav items={navItems} />}>
      <Outlet />
    </MobileShell>
  );
}
