import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TrendingUp, Wallet, Undo2, CalendarCheck, Coins, PlusCircle, Receipt, CalendarDays, FileText, ChevronRight } from "lucide-react";
import { DemoBanner, StatCard, StatusBadge, SyncIndicator, WeekSelector, cashTone, Money, EmptyState } from "@/components/app/primitives";
import { useApp, useCurrentDriver, useDriverRecords } from "@/lib/store";
import { computeSettlement, computeWeekCaja } from "@/lib/finance";
import { fmt } from "@/lib/money";
import { formatShort, todayLima, weekStart } from "@/lib/dates";

export const Route = createFileRoute("/conductor/")({
  component: DriverHome,
});

function DriverHome() {
  const driver = useCurrentDriver();
  const { session } = useApp();
  const recs = useDriverRecords(driver?.id);
  const today = todayLima();
  const [week, setWeek] = useState(weekStart(today));
  const s = useMemo(() => computeSettlement(week, recs, today), [week, recs, today]);
  const recent = useMemo(() => {
    const sorted = [...recs].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5);
    return sorted.map((r) => {
      const wk = recs.filter((x) => weekStart(x.fecha) === weekStart(r.fecha));
      return { r, caja: computeWeekCaja(wk)[r.fecha] };
    });
  }, [recs]);
  if (!driver) return null;
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Lima", hour: "numeric", hour12: false }).format(new Date()));
  const greet = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div>
      <DemoBanner />
      <header className="px-4 pb-4 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{greet},</p>
            <h1 className="text-2xl font-extrabold tracking-tight">{session?.nombre.split(" ")[0]}</h1>
            <span className="mt-1 inline-block rounded-md border bg-card px-2 py-0.5 text-xs font-semibold tracking-wider">{driver.placa}</span>
          </div>
          <SyncIndicator />
        </div>
        <div className="mt-4">
          <WeekSelector value={week} onChange={setWeek} />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2.5 px-4">
        <StatCard className="col-span-2" icon={TrendingUp} label="Producción de la semana" value={fmt(s.produccionTotal)} hint={`${s.diasTrabajados} día(s) trabajado(s)`} />
        <StatCard icon={Coins} label="Ganancia semanal" value={fmt(s.ganancia)} tone="primary" hint={s.definitivo ? "Definitiva" : "Provisional"} />
        <StatCard icon={Wallet} label="Caja chica actual" value={fmt(s.cajaFinal)} tone={cashTone(s.cajaFinal)} />
        <StatCard icon={Undo2} label="Devolución pendiente" value={fmt(s.devolucion)} tone={s.devolucion ? "negative" : "default"} />
        <StatCard icon={CalendarCheck} label="Días trabajados" value={String(s.diasTrabajados)} hint={s.pendientes ? `${s.pendientes} pendiente(s)` : undefined} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 px-4">
        <Link to="/conductor/registrar" search={{ fecha: today }} className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-card">
          <PlusCircle className="size-5" /> Registrar mi día
        </Link>
        <ActionLink to="/conductor/cuadre/$fecha" params={{ fecha: today }} icon={Receipt} label="Ver cuadre de hoy" />
        <ActionLink to="/conductor/historial" icon={CalendarDays} label="Historial diario" />
        <ActionLink to="/conductor/liquidacion" icon={Coins} label="Liquidación semanal" />
        <ActionLink to="/conductor/informe" icon={FileText} label="Informe semanal" />
      </div>

      <section className="mt-6 px-4 pb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Últimos días registrados</h2>
        {recent.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Aún no hay registros" text="Registra tu primer día para ver tu cuadre." />
        ) : (
          <ul className="surface divide-y">
            {recent.map(({ r, caja }) => (
              <li key={r.id}>
                <Link to="/conductor/cuadre/$fecha" params={{ fecha: r.fecha }} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold capitalize">{formatShort(r.fecha)}</p>
                    <p className="num text-xs text-muted-foreground">Prod. {fmt(r.produccion)}</p>
                  </div>
                  <div className="text-right">
                    <Money c={caja.cajaFinal} tone={cashTone(caja.cajaFinal)} className="text-sm font-semibold" />
                    <div className="mt-0.5">
                      <StatusBadge estado={r.estado} />
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ActionLink(props: { to: "/conductor/historial" | "/conductor/liquidacion" | "/conductor/informe" | "/conductor/cuadre/$fecha"; params?: { fecha: string }; icon: typeof Receipt; label: string }) {
  const Icon = props.icon;
  return (
    <Link to={props.to} params={props.params as never} className="surface flex items-center gap-2.5 px-3 py-3.5 text-sm font-semibold">
      <span className="rounded-lg bg-primary-soft p-2 text-primary">
        <Icon className="size-4" />
      </span>
      {props.label}
    </Link>
  );
}
