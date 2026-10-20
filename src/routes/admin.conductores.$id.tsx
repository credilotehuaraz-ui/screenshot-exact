import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, PageHeader, StatusBadge, WeekSelector, Money, cashTone } from "@/components/app/primitives";
import { WeeklySettlement } from "@/components/app/WeeklySettlement";
import { DailyBreakdown } from "@/components/app/DailyBreakdown";
import { useApp, useDriverRecords } from "@/lib/store";
import { computeSettlement, computeWeekCaja } from "@/lib/finance";
import { addDays, formatDateTime, formatShort, todayLima, weekStart } from "@/lib/dates";
import { UserX } from "lucide-react";

export const Route = createFileRoute("/admin/conductores/$id")({
  component: DriverDetail,
});

function DriverDetail() {
  const { id } = Route.useParams();
  const { drivers, audit } = useApp();
  const driver = drivers.find((d) => d.id === id);
  const recs = useDriverRecords(id);
  const today = todayLima();
  const [week, setWeek] = useState(addDays(weekStart(today), -7));
  const [open, setOpen] = useState<string | null>(null);
  const s = useMemo(() => computeSettlement(week, recs, today), [week, recs, today]);
  const caja = useMemo(() => computeWeekCaja(s.dias.flatMap((d) => (d.record ? [d.record] : []))), [s]);

  if (!driver) return <div className="p-4"><EmptyState icon={UserX} title="Conductor no encontrado" /></div>;
  const openRec = open ? s.dias.find((d) => d.fecha === open)?.record : undefined;

  return (
    <div>
      <PageHeader title={driver.nombre} subtitle={`${driver.placa} · ${driver.activo ? "Activo" : "Inactivo"}`} back="/admin/conductores" />
      <div className="space-y-3 p-4">
        <WeekSelector value={week} onChange={setWeek} />
        <Tabs defaultValue="registros">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="registros">Registros</TabsTrigger>
            <TabsTrigger value="liquidacion">Liquidación</TabsTrigger>
            <TabsTrigger value="cambios">Cambios</TabsTrigger>
          </TabsList>
          <TabsContent value="registros" className="space-y-2">
            {s.dias.map((d) => {
              const c = caja[d.fecha];
              return (
                <div key={d.fecha} className="surface flex items-center gap-3 p-3">
                  <button className="min-w-0 flex-1 text-left" disabled={!d.record} onClick={() => setOpen(d.fecha)}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold capitalize">{formatShort(d.fecha)}</span>
                      <StatusBadge estado={d.estado} />
                    </div>
                    {d.record && c && (
                      <p className="num mt-1 text-[11px] text-muted-foreground">
                        Prod. <Money c={d.record.produccion} /> · Caja <Money c={c.cajaFinal} tone={cashTone(c.cajaFinal)} />
                      </p>
                    )}
                  </button>
                  {d.estado !== "futuro" && (
                    <Button asChild variant="ghost" size="icon" aria-label="Corregir">
                      <Link to="/admin/registro" search={{ driverId: id, fecha: d.fecha }}><Pencil /></Link>
                    </Button>
                  )}
                </div>
              );
            })}
          </TabsContent>
          <TabsContent value="liquidacion"><WeeklySettlement s={s} /></TabsContent>
          <TabsContent value="cambios">
            <ul className="surface divide-y">
              {audit.filter((a) => a.driverId === id).map((a) => (
                <li key={a.id} className="p-3 text-sm">
                  <p><span className="font-medium">{a.by}</span> · {a.accion}</p>
                  <p className="text-xs text-muted-foreground">Día {a.fecha} · {formatDateTime(a.at)}</p>
                </li>
              ))}
            </ul>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!openRec} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Cuadre diario</DialogTitle></DialogHeader>
          {openRec && caja[openRec.fecha] && (
            <>
              <DailyBreakdown record={openRec} caja={caja[openRec.fecha]} />
              <Button asChild size="lg"><Link to="/admin/registro" search={{ driverId: id, fecha: openRec.fecha }}><Pencil /> Corregir registro</Link></Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
