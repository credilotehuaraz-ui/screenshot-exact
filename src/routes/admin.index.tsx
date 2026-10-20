import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Users, TrendingUp, Coins, Wallet, Undo2, AlertTriangle, LogOut } from "lucide-react";
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
    () => active.map((d) => ({ d, s: computeSettlement(week, records.filter((r) => r.driverId === d.id), today) })),
    [active, records, week, today],
  );
  const sum = (f: (s: (typeof rows)[number]["s"]) => number) => rows.reduce((a, r) => a + f(r.s), 0);
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
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm">
          <option value="todos">Todos los conductores</option>
          {drivers.filter((d) => d.activo).map((d) => (
            <option key={d.id} value={d.id}>{d.nombre} · {d.placa}</option>
          ))}
        </select>
      </header>

      <div className="grid grid-cols-2 gap-2.5 px-4">
        <StatCard icon={Users} label="Conductores activos" value={String(drivers.filter((d) => d.activo).length)} />
        <StatCard icon={TrendingUp} label="Producción semana" value={fmt(sum((s) => s.produccionTotal))} />
        <StatCard icon={Coins} label="Ganancias calculadas" value={fmt(sum((s) => s.ganancia))} tone="primary" />
        <StatCard icon={Undo2} label="Devoluciones" value={fmt(sum((s) => s.devolucion))} tone="negative" />
      </div>

      <div className="space-y-3 p-4">
        <Section title="Por conductor">
          <ul className="divide-y">
            {rows.map(({ d, s }) => (
              <li key={d.id}>
                <Link to="/admin/conductores/$id" params={{ id: d.id }} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-semibold">{d.nombre}</p>
                    <p className="text-xs text-muted-foreground">{d.placa} · {s.diasTrabajados} días</p>
                  </div>
                  <div className="text-right">
                    <Money c={s.produccionTotal} className="text-sm font-semibold" />
                    <div className="text-[11px]">Caja <Money c={s.cajaFinal} tone={cashTone(s.cajaFinal)} /></div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Saldos negativos de caja">
          {rows.filter((r) => r.s.cajaFinal < 0).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin saldos negativos.</p>
          ) : (
            rows.filter((r) => r.s.cajaFinal < 0).map(({ d, s }) => (
              <div key={d.id} className="flex justify-between py-1 text-sm">
                <span><Wallet className="mr-1 inline size-3.5" />{d.nombre}</span>
                <Money c={s.cajaFinal} tone="negative" />
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
