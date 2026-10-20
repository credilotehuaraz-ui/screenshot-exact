import { computeWeekCaja, fuelTotal, type Settlement } from "@/lib/finance";
import { fmt } from "@/lib/money";
import { dayName, formatShort, formatWeekRange } from "@/lib/dates";
import { StatusBadge, cashTone, toneText } from "./primitives";
import { cn } from "@/lib/utils";
import type { Driver } from "@/lib/store";

function useRows(s: Settlement) {
  const caja = computeWeekCaja(s.dias.flatMap((d) => (d.record ? [d.record] : [])));
  return s.dias.map((d) => ({ ...d, caja: caja[d.fecha] }));
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: ReturnType<typeof cashTone> }) {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("num", tone && toneText[tone])}>{value}</span>
    </div>
  );
}


/** Detailed per-day cards (mobile). */
export function ReportDetailed({ s }: { s: Settlement }) {
  const rows = useRows(s);
  return (
    <div className="space-y-2">
      {rows.map((d) => (
        <div key={d.fecha} className={cn("surface p-3", !d.record && "border-dashed bg-background shadow-none")}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold capitalize">{formatShort(d.fecha)}</span>
            <StatusBadge estado={d.estado} />
          </div>
          {d.record && d.caja ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <Cell label="Producción" value={fmt(d.record.produccion)} />
              <Cell label="A bordo" value={fmt(d.record.abordo)} />
              <Cell label="Gasolina" value={fmt(d.caja.gasolina)} />
              <Cell label="Recibido" value={fmt(d.record.recibido)} />
              <Cell label="Peajes" value={fmt(d.record.peajes)} />
              <Cell label="Caja final" value={fmt(d.caja.cajaFinal)} tone={cashTone(d.caja.cajaFinal)} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{d.estado === "futuro" ? "Día aún no transcurrido." : "No hay registro. No se asume día libre."}</p>
          )}
        </div>
      ))}
      <WeekTotals s={s} />
    </div>
  );
}

function WeekTotals({ s, className }: { s: Settlement; className?: string }) {
  return (
    <div className={cn("space-y-1.5 rounded-xl bg-primary-soft p-4", className)}>
      <Cell label="Producción total" value={fmt(s.produccionTotal)} />
      <Cell label="Días trabajados" value={String(s.diasTrabajados)} />
      <Cell label="Devolución pendiente" value={fmt(s.devolucion)} tone={s.devolucion ? "negative" : undefined} />
      <Cell label="Ganancia semanal" value={fmt(s.ganancia)} tone="primary" />
      <div className="flex items-baseline justify-between border-t border-dashed pt-2">
        <span className="text-sm font-semibold">Total por recibir</span>
        <span className="num text-lg font-bold text-primary">{fmt(s.totalRecibir)}</span>
      </div>
    </div>
  );
}

/** Compact table for export (image / PDF). */
export function ReportCompact({ s, driver }: { s: Settlement; driver: Driver }) {
  const rows = useRows(s);
  return (
    <div className="surface overflow-x-auto p-3">
      <div className="mb-2 flex justify-between text-xs">
        <span className="font-semibold">{driver.nombre} · {driver.placa}</span>
        <span className="text-muted-foreground">{formatWeekRange(s.dias[0].fecha)}</span>
      </div>
      <table className="num w-full text-[11px]">
        <thead className="text-muted-foreground">
          <tr className="border-b text-right">
            <th className="py-1 text-left font-medium">Día</th>
            <th className="font-medium">Prod.</th>
            <th className="font-medium">Gas.</th>
            <th className="font-medium">Peaj.</th>
            <th className="font-medium">Caja</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.fecha} className="border-b text-right last:border-0">
              <td className="py-1.5 text-left capitalize">{formatShort(d.fecha).split(" ").slice(0, 2).join(" ")}</td>
              {d.record && d.caja ? (
                <>
                  <td>{(d.record.produccion / 100).toFixed(2)}</td>
                  <td>{(d.caja.gasolina / 100).toFixed(2)}</td>
                  <td>{(d.record.peajes / 100).toFixed(2)}</td>
                  <td className={toneText[cashTone(d.caja.cajaFinal)]}>{(d.caja.cajaFinal / 100).toFixed(2)}</td>
                </>
              ) : (
                <td colSpan={4} className="text-center text-muted-foreground">
                  {d.estado === "futuro" ? "por venir" : "sin datos"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <WeekTotals s={s} className="mt-3" />
    </div>
  );
}

/** Landscape export template: 6 daily boxes in a 3×2 grid + weekly box spanning both rows. */
export function ReportPanoramic({ s, driver }: { s: Settlement; driver: Driver }) {
  const rows = useRows(s);
  const primary = rows.filter((d) => d.record && d.estado !== "no_trabajado");
  const six = [...primary, ...rows.filter((d) => !primary.includes(d))].slice(0, 6).sort((a, b) => a.fecha.localeCompare(b.fecha));
  return (
    <div className="overflow-x-auto rounded-xl border bg-muted p-2">
      <div className="w-[1120px] rounded-lg bg-background p-5">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="text-lg font-extrabold">
              Control <span className="text-primary">Cabify</span> · Informe semanal
            </div>
            <div className="text-sm text-muted-foreground">
              {driver.nombre} · Placa {driver.placa}
            </div>
          </div>
          <div className="text-sm font-semibold">{formatWeekRange(s.dias[0].fecha)}</div>
        </div>
        <div className="grid grid-cols-4 grid-rows-2 gap-3">
          <div className="col-start-4 row-span-2 row-start-1 flex flex-col justify-between rounded-xl bg-primary-soft p-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">Resumen semanal</p>
              <Cell label="Producción total" value={fmt(s.produccionTotal)} />
              <Cell label="Días trabajados" value={String(s.diasTrabajados)} />
              <Cell label="Descuento (200 × días)" value={fmt(s.descuento)} />
              <Cell label="Excedente" value={fmt(s.excedente)} />
              <Cell label="Participación 40%" value={fmt(s.participacion)} />
              <Cell label="Comisión (70 × días)" value={fmt(s.comision)} />
              <Cell label="Ganancia semanal" value={fmt(s.ganancia)} tone="primary" />
              <Cell label="Devolución caja" value={fmt(s.devolucion)} tone={s.devolucion ? "negative" : undefined} />
            </div>
            <div className="mt-4 rounded-lg bg-primary p-3 text-primary-foreground">
              <div className="text-[11px] font-semibold uppercase opacity-80">Total por recibir</div>
              <div className="num text-2xl font-bold">{fmt(s.totalRecibir)}</div>
              {!s.definitivo && <div className="text-[11px] opacity-80">Provisional</div>}
            </div>
          </div>
          {six.map((d) => (
            <div key={d.fecha} className={cn("rounded-xl border p-3", d.record ? "bg-card" : "border-dashed")}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">
                  {dayName(d.fecha)} {formatShort(d.fecha).split(" ")[1]}
                </span>
                <StatusBadge estado={d.estado} />
              </div>
              {d.record && d.caja ? (
                <div className="space-y-1">
                  <Cell label="Producción" value={fmt(d.record.produccion)} />
                  <Cell label="Gasolina" value={d.record.gasolina.length ? `${d.record.gasolina.length}× · ${fmt(fuelTotal(d.record))}` : fmt(0)} />
                  <Cell label="Peajes" value={fmt(d.record.peajes)} />
                  <Cell label="A bordo" value={fmt(d.record.abordo)} />
                  <Cell label="Recibido" value={fmt(d.record.recibido)} />
                  <Cell label="Caja final" value={fmt(d.caja.cajaFinal)} tone={cashTone(d.caja.cajaFinal)} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sin datos registrados</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
