import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Users, TrendingUp, Coins, Wallet, LogOut, PlusCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBanner, Logo, Section, StatCard, SyncIndicator, WeekSelector, Money, cashTone } from "@/components/app/primitives";
import { useApp } from "@/lib/store";
import { computeSettlement } from "@/lib/finance";
import { fmt } from "@/lib/money";
import { formatDateTime, formatShort, todayLima, weekStart } from "@/lib/dates";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { drivers, records, audit, logout } = useApp();
  const navigate = useNavigate();
  const today = todayLima();
  const [week, setWeek] = useState(weekStart(today));
  const [filter, setFilter] = useState("todos");

  const active = drivers.filter((d) => d.activo && (filter === "todos" || d.id === filter));
  const rows = useMemo(
    () => active.map((d) => {
      const driverRecs = records.filter((r) => r.driverId === d.id);
      const s = computeSettlement(week, driverRecs, today);
      return { d, s };
    }),
    [active, records, week, today],
  );

  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
  const incompletos = rows.flatMap(({ d, s }) => s.dias.filter((x) => x.estado === "pendiente" || x.estado === "sin_datos").map((x) => ({ d, x })));

  return (
    <div>
      <DemoBanner />
      <header className="space-y-3 px-4 pb-3 pt-5">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-1">
            <SyncIndicator compact />
            <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={() => { logout(); navigate({ to: "/" }); }}>
              <LogOut />
            </Button>
          </div>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Panel administrativo</h1>
        <WeekSelector value={week} onChange={setWeek} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm font-medium">
          <option value="todos">Todos los conductores</option>
          {drivers.filter((d) => d.activo).map((d) => (
            <option key={d.id} value={d.id}>{d.nombre} · {d.placa}</option>
          ))}
        </select>
      </header>

      <div className="px-4 pb-3 space-y-2">
        <Button asChild size="lg" className="w-full font-bold">
          <Link to="/admin/registro" search={{ fecha: today }}>
            <PlusCircle /> Registrar producción diaria
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-4">
        <StatCard icon={Users} label="Conductores activos" value={String(drivers.filter((d) => d.activo).length)} />
        <StatCard icon={TrendingUp} label="Producción semana" value={fmt(sum((r) => r.s.produccionTotal))} />
        <StatCard icon={Coins} label="Ganancias calculadas" value={fmt(sum((r) => r.s.ganancia))} tone="primary" />
        <StatCard icon={Wallet} label="Total caja acumulada" value={fmt(sum((r) => r.s.cajaFinal))} tone="warning" />
      </div>

      <div className="space-y-3 p-4">
        {/* Sección Estado de Caja Chica por Conductor */}
        <Section title="Estado de Caja Chica por Conductor">
          <ul className="divide-y space-y-1">
            {rows.map(({ d, s }) => (
              <li key={d.id} className="py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to="/admin/conductores/$id" params={{ id: d.id }} className="font-bold text-sm text-foreground hover:underline">
                      {d.nombre} ({d.placa})
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Caja chica semanal: <span className="font-semibold">{fmt(s.cajaFinal)}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    {s.cajaFinal > 0 ? (
                      <span className="inline-block text-xs font-bold text-negative bg-negative-soft px-2 py-0.5 rounded-full">
                        Debes a Empresa: {fmt(s.cajaFinal)}
                      </span>
                    ) : s.cajaFinal < 0 ? (
                      <span className="inline-block text-xs font-bold text-positive bg-positive-soft px-2 py-0.5 rounded-full">
                        Empresa debe: {fmt(Math.abs(s.cajaFinal))}
                      </span>
                    ) : (
                      <span className="inline-block text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        ✓ Caja al día: S/ 0.00
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Saldos de caja chica">
          {rows.filter((r) => r.s.cajaFinal !== 0).length === 0 ? (
            <p className="text-sm text-muted-foreground">Todas las cajas están al día (S/ 0.00).</p>
          ) : (
            rows.filter((r) => r.s.cajaFinal !== 0).map(({ d, s }) => (
              <div key={d.id} className="flex justify-between py-1 text-sm">
                <span><Wallet className="mr-1 inline size-3.5" />{d.nombre}</span>
                <Money c={s.cajaFinal} tone={cashTone(s.cajaFinal)} />
              </div>
            ))
          )}
        </Section>

        <Section title={`Registros incompletos (${incompletos.length})`}>
          {incompletos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todo completo.</p>
          ) : (
            incompletos.slice(0, 8).map(({ d, x }) => (
              <Link key={d.id + x.fecha} to="/admin/registro" search={{ driverId: d.id, fecha: x.fecha }} className="flex items-center justify-between py-1.5 text-sm">
                <span className="flex items-center gap-1.5"><AlertTriangle className="size-3.5 text-warning" />{d.nombre.split(" ")[0]} · <span className="capitalize">{formatShort(x.fecha)}</span></span>
                <span className="text-xs text-muted-foreground">{x.estado === "pendiente" ? "Pendiente" : "Sin datos"}</span>
              </Link>
            ))
          )}
        </Section>

        <Section title="Últimas modificaciones">
          <ul className="space-y-2">
            {audit.slice(0, 6).map((a) => (
              <li key={a.id} className="text-sm">
                <p><span className="font-medium">{a.by}</span> · {a.accion}</p>
                <p className="text-xs text-muted-foreground">Día {a.fecha} · {formatDateTime(a.at)}</p>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
