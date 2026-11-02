import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, PlusCircle, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, PageHeader, Section, StatusBadge, WeekSelector, Money, cashTone } from "@/components/app/primitives";
import { DailyBreakdown } from "@/components/app/DailyBreakdown";
import { useApp } from "@/lib/store";
import { computeSettlement, computeWeekCaja } from "@/lib/finance";
import { formatShort, todayLima, weekStart } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/historial")({
  validateSearch: (s: Record<string, unknown>): { driverId?: string; week?: string; fecha?: string } => ({
    driverId: typeof s.driverId === "string" ? s.driverId : undefined,
    week: typeof s.week === "string" ? s.week : undefined,
    fecha: typeof s.fecha === "string" ? s.fecha : undefined,
  }),
  component: AdminHistorial,
});

function AdminHistorial() {
  const search = Route.useSearch();
  const { drivers, records } = useApp();
  const today = todayLima();

  const [selectedDriver, setSelectedDriver] = useState<string>(search.driverId ?? "todos");
  const [week, setWeek] = useState<string>(search.week ?? weekStart(today));
  const [openDetail, setOpenDetail] = useState<{ driverId: string; fecha: string } | null>(
    search.driverId && search.fecha ? { driverId: search.driverId, fecha: search.fecha } : null,
  );

  const activeDrivers = drivers.filter((d) => d.activo);
  const filteredDrivers = selectedDriver === "todos" ? activeDrivers : activeDrivers.filter((d) => d.id === selectedDriver);

  // Generar la información de liquidación y caja de cada conductor seleccionado para la semana
  const rows = useMemo(() => {
    return filteredDrivers.map((d) => {
      const driverRecs = records.filter((r) => r.driverId === d.id);
      const s = computeSettlement(week, driverRecs, today);
      const caja = computeWeekCaja(s.dias.flatMap((x) => (x.record ? [x.record] : [])));
      return { d, s, caja };
    });
  }, [filteredDrivers, records, week, today]);

  // Buscar el registro seleccionado para ver el cuadre detallado en el diálogo
  const detailData = useMemo(() => {
    if (!openDetail) return null;
    const d = drivers.find((x) => x.id === openDetail.driverId);
    if (!d) return null;
    const driverRecs = records.filter((r) => r.driverId === d.id);
    const rec = driverRecs.find((r) => r.fecha === openDetail.fecha);
    if (!rec) return null;
    const c = computeWeekCaja(driverRecs.filter((r) => weekStart(r.fecha) === weekStart(openDetail.fecha)))[openDetail.fecha];
    return { driver: d, record: rec, caja: c };
  }, [openDetail, drivers, records]);

  return (
    <div>
      <PageHeader
        title="Historial de flota"
        subtitle="Registros diarios cargados"
        right={
          <Button asChild size="sm">
            <Link to="/admin/registro" search={{ fecha: today }}>
              <PlusCircle /> Registrar día
            </Link>
          </Button>
        }
      />

      <div className="space-y-4 p-4">
        {/* Controles de filtro */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filtrar por conductor</label>
          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            className="h-11 w-full rounded-xl border bg-background px-3 text-sm font-medium"
          >
            <option value="todos">Todos los conductores ({activeDrivers.length})</option>
            {activeDrivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre} · {d.placa}
              </option>
            ))}
          </select>
        </div>

        <WeekSelector value={week} onChange={setWeek} />

        {/* Lista de conductores con sus registros semanales */}
        {rows.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Sin conductores" text="No hay conductores activos para mostrar." />
        ) : (
          rows.map(({ d, s, caja }) => (
            <Section
              key={d.id}
              title={`${d.nombre} (${d.placa})`}
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin/registro" search={{ driverId: d.id, fecha: today }}>
                    + Registrar
                  </Link>
                </Button>
              }
            >
              <div className="space-y-2">
                {s.dias.map((day) => {
                  const c = caja[day.fecha];
                  const isTarget = search.fecha === day.fecha && search.driverId === d.id;

                  return (
                    <div
                      key={day.fecha}
                      className={cn(
                        "surface flex items-center gap-3 p-3 transition-colors",
                        isTarget && "border-primary bg-primary-soft/40",
                        !day.record && "border-dashed opacity-75",
                      )}
                    >
                      <button
                        className="min-w-0 flex-1 text-left"
                        disabled={!day.record}
                        onClick={() => setOpenDetail({ driverId: d.id, fecha: day.fecha })}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold capitalize">{formatShort(day.fecha)}</span>
                          <StatusBadge estado={day.estado} />
                          {isTarget && <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">Reciente</span>}
                        </div>

                        {day.record && c ? (
                          <div className="num mt-1 grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                            <span>Prod. <Money c={day.record.produccion} /></span>
                            <span>Caja <Money c={c.cajaFinal} tone={cashTone(c.cajaFinal)} /></span>
                          </div>
                        ) : (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {day.estado === "futuro" ? "Aún no transcurre" : "Sin registro cargado"}
                          </p>
                        )}
                      </button>

                      {day.estado !== "futuro" && (
                        <Button asChild variant="outline" size="sm" className="h-8 shrink-0 px-2.5 text-xs">
                          <Link to="/admin/registro" search={{ driverId: d.id, fecha: day.fecha }}>
                            <Pencil className="size-3.5" /> {day.record ? "Editar" : "Cargar"}
                          </Link>
                        </Button>
                      )}

                      {day.record && <ChevronRight className="size-4 text-muted-foreground shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </Section>
          ))
        )}
      </div>

      {/* Modal de cuadre detallado */}
      <Dialog open={!!detailData} onOpenChange={(open) => !open && setOpenDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cuadre diario de {detailData?.driver.nombre}</DialogTitle>
          </DialogHeader>
          {detailData && detailData.caja && (
            <>
              <DailyBreakdown record={detailData.record} caja={detailData.caja} />
              <Button asChild size="lg" className="mt-2">
                <Link to="/admin/registro" search={{ driverId: detailData.driver.id, fecha: detailData.record.fecha }}>
                  <Pencil /> Corregir este registro
                </Link>
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
