import { AlertTriangle } from "lucide-react";
import { DAILY_BASE, FIXED_COMMISSION, type Settlement } from "@/lib/finance";
import { fmt } from "@/lib/money";
import { dayName } from "@/lib/dates";
import { OpLine, Section, StatusBadge, cashTone } from "./primitives";
import { cn } from "@/lib/utils";

export function SettlementWarning({ s }: { s: Settlement }) {
  if (s.definitivo) return null;
  const parts = [
    s.pendientes && `${s.pendientes} día(s) pendiente(s) de confirmar`,
    s.sinDatos && `${s.sinDatos} día(s) sin datos`,
    s.futuros && `${s.futuros} día(s) aún por venir`,
  ].filter(Boolean);
  return (
    <div className="flex gap-3 rounded-xl bg-warning-soft p-3.5 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
      <div>
        <p className="font-semibold text-warning">Resultado provisional</p>
        <p className="text-foreground/80">{parts.join(" · ")}. Confirma el estado de esos días antes de dar la liquidación por definitiva.</p>
      </div>
    </div>
  );
}

export function WeeklySettlement({ s }: { s: Settlement }) {
  const n = s.diasTrabajados;
  return (
    <div className="space-y-3">
      <SettlementWarning s={s} />

      <Section title="Resumen de producción">
        <div className="divide-y">
          {s.dias.map((d) => (
            <div key={d.fecha} className="flex items-center justify-between gap-2 py-2">
              <span className="text-sm">{dayName(d.fecha)}</span>
              {d.estado === "trabajado" ? <span className="num text-sm">{fmt(d.produccion)}</span> : <StatusBadge estado={d.estado} />}
            </div>
          ))}
        </div>
        <OpLine op="=" label="Producción total" value={fmt(s.produccionTotal)} total />
        <OpLine label="Días trabajados" value={String(n)} />
      </Section>

      <Section title="Operaciones de liquidación">
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-sm font-semibold">Descuento por días</p>
            <OpLine label="Base diaria" value={fmt(DAILY_BASE)} />
            <OpLine op="×" label="Días trabajados" value={String(n)} />
            <OpLine op="=" label="Descuento" value={fmt(s.descuento)} total />
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold">Excedente</p>
            <OpLine label="Producción total" value={fmt(s.produccionTotal)} />
            <OpLine op="−" label="Descuento" value={fmt(s.descuento)} />
            <OpLine op="=" label="Excedente" value={fmt(s.excedente)} tone={cashTone(s.excedente)} total />
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold">Participación del conductor</p>
            <OpLine label="Excedente" value={fmt(s.excedente)} />
            <OpLine op="×" label="Porcentaje" value="0.40" />
            <OpLine op="=" label="Participación" value={fmt(s.participacion)} total />
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold">Comisión fija</p>
            <OpLine label="Comisión diaria" value={fmt(FIXED_COMMISSION)} />
            <OpLine op="×" label="Días trabajados" value={String(n)} />
            <OpLine op="=" label="Comisión" value={fmt(s.comision)} total />
          </div>
        </div>
      </Section>

      <div className="rounded-xl bg-primary-soft p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">Ganancia semanal</p>
        <OpLine label="Participación" value={fmt(s.participacion)} />
        <OpLine op="+" label="Comisión fija" value={fmt(s.comision)} />
        <OpLine op="=" label="Ganancia" value={fmt(s.ganancia)} tone="primary" total big />
      </div>

      <Section title="Devolución de caja chica">
        <OpLine label="Caja final de la semana" value={fmt(s.cajaFinal)} tone={cashTone(s.cajaFinal)} />
        <OpLine label="Devolución pendiente" value={fmt(s.devolucion)} tone={s.devolucion > 0 ? "negative" : "default"} />
        {s.cajaFinal > 0 && <p className="mt-1 text-xs text-muted-foreground">El saldo positivo se conserva en caja y no se suma al pago.</p>}
      </Section>

      <div className={cn("rounded-xl p-5", "bg-primary text-primary-foreground")}>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Total por recibir</p>
        <p className="num mt-1 text-sm opacity-90">
          {fmt(s.ganancia)} + {fmt(s.devolucion)}
        </p>
        <p className="num mt-1 text-3xl font-bold">{fmt(s.totalRecibir)}</p>
        {!s.definitivo && <p className="mt-1 text-xs opacity-80">Provisional</p>}
      </div>
    </div>
  );
}
