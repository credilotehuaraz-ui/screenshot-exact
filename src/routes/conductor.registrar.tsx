import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/primitives";
import { RecordForm } from "@/components/app/RecordForm";
import { useCurrentDriver, useDriverRecords } from "@/lib/store";
import { computeWeekCaja } from "@/lib/finance";
import { fmt } from "@/lib/money";
import { todayLima, weekStart } from "@/lib/dates";

export const Route = createFileRoute("/conductor/registrar")({
  validateSearch: (s: Record<string, unknown>): { fecha?: string } => ({ fecha: typeof s.fecha === "string" ? s.fecha : undefined }),
  component: Registrar,
});

function Registrar() {
  const { fecha } = Route.useSearch();
  const driver = useCurrentDriver();
  const recs = useDriverRecords(driver?.id);
  const navigate = useNavigate();
  if (!driver) return null;
  const initial = fecha ?? todayLima();
  const exists = recs.some((r) => r.fecha === initial);

  return (
    <div>
      <PageHeader title={exists ? "Editar registro" : "Registrar mi día"} subtitle={`${driver.nombre} · ${driver.placa}`} back="/conductor" />
      <RecordForm
        driver={driver}
        initialFecha={initial}
        onCancel={() => navigate({ to: "/conductor" })}
        onViewCuadre={(f) => navigate({ to: "/conductor/cuadre/$fecha", params: { fecha: f } })}
        onSaved={(r) => {
          const wk = [...recs.filter((x) => x.id !== r.id && x.fecha !== r.fecha), r].filter((x) => weekStart(x.fecha) === weekStart(r.fecha));
          const c = computeWeekCaja(wk)[r.fecha];
          toast.success("Registro guardado", { description: `Caja final: ${fmt(c.cajaFinal)}${c.devolucion ? ` · Devolución ${fmt(c.devolucion)}` : ""}` });
          navigate({ to: "/conductor/cuadre/$fecha", params: { fecha: r.fecha } });
        }}
      />
    </div>
  );
}
