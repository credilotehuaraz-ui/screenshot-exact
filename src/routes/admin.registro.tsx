import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/primitives";
import { RecordForm } from "@/components/app/RecordForm";
import { useApp } from "@/lib/store";
import { todayLima } from "@/lib/dates";

export const Route = createFileRoute("/admin/registro")({
  validateSearch: (s: Record<string, unknown>): { driverId: string; fecha?: string } => ({
    driverId: typeof s.driverId === "string" ? s.driverId : "",
    fecha: typeof s.fecha === "string" ? s.fecha : undefined,
  }),
  component: AdminRegistro,
});

function AdminRegistro() {
  const { driverId, fecha } = Route.useSearch();
  const { drivers } = useApp();
  const navigate = useNavigate();
  const driver = drivers.find((d) => d.id === driverId);
  if (!driver) return <p className="p-4 text-sm">Conductor no encontrado.</p>;
  const back = () => navigate({ to: "/admin/conductores/$id", params: { id: driver.id } });
  return (
    <div>
      <PageHeader title="Corregir registro" subtitle={`${driver.nombre} · queda constancia del cambio`} back="/admin/conductores" />
      <RecordForm
        driver={driver}
        initialFecha={fecha ?? todayLima()}
        onCancel={back}
        onViewCuadre={back}
        onSaved={() => {
          toast.success("Corrección guardada y registrada");
          back();
        }}
      />
    </div>
  );
}
