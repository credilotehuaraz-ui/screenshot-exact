import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarSearch, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusBadge, WeekSelector, cashTone, toneText } from "@/components/app/primitives";
import { useCurrentDriver, useDriverRecords } from "@/lib/store";
import { computeSettlement, computeWeekCaja } from "@/lib/finance";
import { fmt } from "@/lib/money";
import { formatShort, fromLocalDate, todayLima, toLocalDate, weekStart } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/conductor/historial")({
  component: Historial,
});

function Historial() {
  const driver = useCurrentDriver();
  const recs = useDriverRecords(driver?.id);
  const navigate = useNavigate();
  const today = todayLima();
  const [week, setWeek] = useState(weekStart(today));
  const [showCal, setShowCal] = useState(false);
  const s = useMemo(() => computeSettlement(week, recs, today), [week, recs, today]);
  const caja = useMemo(() => computeWeekCaja(s.dias.flatMap((d) => (d.record ? [d.record] : []))), [s]);
  if (!driver) return null;

  const byState = (st: string) => recs.filter((r) => r.estado === st).map((r) => toLocalDate(r.fecha));

  return (
    <div>
      <PageHeader
        title="Historial diario"
        subtitle={driver.placa}
        right={
          <Button variant={showCal ? "secondary" : "ghost"} size="icon" onClick={() => setShowCal((v) => !v)} aria-label="Buscar por fecha">
            <CalendarSearch className="size-5" />
          </Button>
        }
      />
      <div className="space-y-3 p-4">
        {showCal && (
          <div className="surface flex flex-col items-center p-2">
            <Calendar
              mode="single"
              selected={toLocalDate(week)}
              defaultMonth={toLocalDate(week)}
              disabled={{ after: toLocalDate(today) }}
              onSelect={(d) => d && navigate({ to: "/conductor/cuadre/$fecha", params: { fecha: fromLocalDate(d) } })}
              modifiers={{ trabajado: byState("trabajado"), pendiente: byState("pendiente"), no_trabajado: byState("no_trabajado") }}
              modifiersClassNames={{
                trabajado: "[&>button]:bg-positive-soft [&>button]:text-positive",
                pendiente: "[&>button]:bg-warning-soft [&>button]:text-warning",
                no_trabajado: "[&>button]:bg-muted [&>button]:line-through",
              }}
            />
            <div className="flex flex-wrap justify-center gap-2 pb-2 text-[11px]">
              <StatusBadge estado="trabajado" />
              <StatusBadge estado="pendiente" />
              <StatusBadge estado="no_trabajado" />
              <span className="text-muted-foreground">Sin color = sin datos</span>
            </div>
          </div>
        )}
        <WeekSelector value={week} onChange={setWeek} />
        <ul className="space-y-2">
          {s.dias.map((d) => {
            const c = caja[d.fecha];
            return (
              <li key={d.fecha}>
                <Link
                  to={d.record ? "/conductor/cuadre/$fecha" : "/conductor/registrar"}
                  params={{ fecha: d.fecha } as never}
                  search={(d.record ? undefined : { fecha: d.fecha }) as never}
                  disabled={d.estado === "futuro"}
                  className={cn("flex items-center gap-3 rounded-xl border p-3", d.record ? "bg-card shadow-card" : "border-dashed", d.estado === "futuro" && "opacity-50")}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold capitalize">{formatShort(d.fecha)}</span>
                      <StatusBadge estado={d.estado} />
                    </div>
                    {d.record && c ? (
                      <div className="num mt-1.5 grid grid-cols-3 gap-1 text-[11px] text-muted-foreground">
                        <span>Prod. {fmt(d.record.produccion)}</span>
                        <span>Gas. {fmt(c.gasolina)}</span>
                        <span>Peaj. {fmt(d.record.peajes)}</span>
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px] text-muted-foreground">{d.estado === "futuro" ? "Aún no transcurre" : "Toca para registrar"}</p>
                    )}
                  </div>
                  {c && (
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground">Caja final</div>
                      <div className={cn("num text-sm font-semibold", toneText[cashTone(c.cajaFinal)])}>{fmt(c.cajaFinal)}</div>
                    </div>
                  )}
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
