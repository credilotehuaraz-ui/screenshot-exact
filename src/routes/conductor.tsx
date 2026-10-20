import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home, PlusCircle, CalendarDays, UserRound } from "lucide-react";
import { BottomNav, FullLoader, MobileShell } from "@/components/app/primitives";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/conductor")({
  head: () => ({
    meta: [
      { title: "Conductor · Control Cabify" },
      { name: "description", content: "Tu producción, caja chica y liquidación semanal." },
      { property: "og:title", content: "Conductor · Control Cabify" },
      { property: "og:description", content: "Tu producción, caja chica y liquidación semanal." },
    ],
  }),
  component: ConductorLayout,
});

function ConductorLayout() {
  const { hydrated, session } = useApp();
  const navigate = useNavigate();
  const ok = session?.role === "conductor";
  useEffect(() => {
    if (hydrated && !ok) navigate({ to: "/" });
  }, [hydrated, ok, navigate]);
  if (!hydrated || !ok) return <FullLoader />;
  return (
    <MobileShell
      nav={
        <BottomNav
          items={[
            { to: "/conductor", label: "Inicio", icon: Home, exact: true },
            { to: "/conductor/registrar", label: "Registrar", icon: PlusCircle },
            { to: "/conductor/historial", label: "Historial", icon: CalendarDays },
            { to: "/conductor/cuenta", label: "Mi cuenta", icon: UserRound },
          ]}
        />
      }
    >
      <Outlet />
    </MobileShell>
  );
}
