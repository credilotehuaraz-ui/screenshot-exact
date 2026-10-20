import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Pencil, Share2, FileQuestion } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/app/primitives";
import { DailyBreakdown, cuadreText } from "@/components/app/DailyBreakdown";
import { useCurrentDriver, useDriverRecords } from "@/lib/store";
import { computeWeekCaja } from "@/lib/finance";
import { addDays, formatLong, todayLima, weekStart } from "@/lib/dates";

export const Route = createFileRoute("/conductor/cuadre/$fecha")({
  component: Cuadre,
});

export async function shareText(text: string) {
  try {
    if (navigator.share) await navigator.share({ title: "Control Cabify", text });
    else {
      await navigator.clipboard.writeText(text);
      toast.success("Informe copiado al portapapeles");
    }
  } catch {
    /* cancelled */
  }
}

function Cuadre() {
  const { fecha } = Route.useParams();
  const driver = useCurrentDriver();
  const recs = useDriverRecords(driver?.id);
  if (!driver) return null;
  const record = recs.find((r) => r.fecha === fecha);
  const caja = record ? computeWeekCaja(recs.filter((r) => weekStart(r.fecha) === weekStart(fecha)))[fecha] : undefined;
  const prev = addDays(fecha, -1);
  const next = addDays(fecha, 1);
  const canNext = next <= todayLima();

  return (
    <div>
      <PageHeader title="Cuadre diario" subtitle={`${driver.placa}`} back="/conductor" />
      <div className="flex items-center justify-between px-4 pt-3">
        <Link to="/conductor/cuadre/$fecha" params={{ fecha: prev }} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted">
          <ChevronLeft className="size-4" /> Anterior
        </Link>
        {canNext ? (
          <Link to="/conductor/cuadre/$fecha" params={{ fecha: next }} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted">
            Siguiente <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span />
        )}
      </div>
      <div className="p-4">
        {record && caja ? (
          <>
            <DailyBreakdown record={record} caja={caja} />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button asChild variant="outline" size="xl">
                <Link to="/conductor/registrar" search={{ fecha }}>
                  <Pencil /> Editar registro
                </Link>
              </Button>
              <Button size="xl" onClick={() => shareText(cuadreText(record, caja, driver.nombre, driver.placa))}>
                <Share2 /> Compartir
              </Button>
            </div>
          </>
        ) : (
          <EmptyState
            icon={FileQuestion}
            title="Sin datos para esta fecha"
            text={`No hay registro del ${formatLong(fecha)}. No se asume que fue un día libre.`}
            action={
              <Button asChild>
                <Link to="/conductor/registrar" search={{ fecha }}>
                  Registrar este día
                </Link>
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
