import type { CajaDay, DailyRecord } from "@/lib/finance";
import { fmt } from "@/lib/money";
import { formatLong } from "@/lib/dates";
import { OpLine, Section, StatusBadge, cashTone } from "./primitives";
import { cn } from "@/lib/utils";

/** Vertical petty-cash breakdown for one day. Production is kept separate from the cash box. */
export function DailyBreakdown({ record, caja }: { record: DailyRecord; caja: CajaDay }) {
  const fuel = record.gasolina;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium capitalize">{formatLong(record.fecha)}</p>
        <StatusBadge estado={record.estado} />
      </div>

      <Section title="Producción">
        <div className="num text-3xl font-bold">{fmt(record.produccion)}</div>
        <p className="mt-1 text-xs text-muted-foreground">No se mezcla con la caja chica.</p>
      </Section>

      <Section title="Gasolina">
        {fuel.length === 0 ? (
          <OpLine label="Sin gastos" value={fmt(0)} />
        ) : (
          fuel.map((g, i) => <OpLine key={g.id} op={i === 0 ? "" : "+"} label={g.desc || `Gasto ${i + 1}`} value={fmt(g.monto)} />)
        )}
        <OpLine op="=" label="Total gasolina" value={fmt(caja.gasolina)} total />
      </Section>

      <Section title="Caja chica">
        <OpLine label="Caja anterior" value={fmt(caja.cajaAnterior)} />
        <OpLine op="+" label="A bordo" value={fmt(caja.abordo)} />
        <OpLine op="+" label="Dinero recibido" value={fmt(caja.recibido)} />
        <OpLine op="=" label="Subtotal" value={fmt(caja.subtotal)} total />
        <OpLine op="−" label="Gasolina" value={fmt(caja.gasolina)} />
        <OpLine op="−" label="Peajes" value={fmt(caja.peajes)} />
        <OpLine op="=" label="Caja final" value={fmt(caja.cajaFinal)} tone={cashTone(caja.cajaFinal)} total big />
      </Section>

      <div className={cn("rounded-xl p-4", caja.devolucion > 0 ? "bg-negative-soft" : "bg-positive-soft")}>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {caja.devolucion > 0 ? "Devolución pendiente" : "Saldo positivo en caja"}
        </div>
        <div className={cn("num mt-1 text-2xl font-bold", caja.devolucion > 0 ? "text-negative" : "text-positive")}>
          {fmt(caja.devolucion > 0 ? caja.devolucion : caja.cajaFinal)}
        </div>
      </div>

      {record.obs && (
        <Section title="Observaciones">
          <p className="text-sm">{record.obs}</p>
        </Section>
      )}
    </div>
  );
}

export function cuadreText(record: DailyRecord, caja: CajaDay, nombre: string, placa: string) {
  return [
    `Control Cabify — ${nombre} (${placa})`,
    formatLong(record.fecha),
    `Producción: ${fmt(record.produccion)}`,
    `Gasolina: ${record.gasolina.map((g) => fmt(g.monto)).join(" + ") || fmt(0)} = ${fmt(caja.gasolina)}`,
    `Caja anterior ${fmt(caja.cajaAnterior)} + A bordo ${fmt(caja.abordo)} + Recibido ${fmt(caja.recibido)} = ${fmt(caja.subtotal)}`,
    `− Gasolina ${fmt(caja.gasolina)} − Peajes ${fmt(caja.peajes)} = Caja final ${fmt(caja.cajaFinal)}`,
    caja.devolucion > 0 ? `Devolución pendiente: ${fmt(caja.devolucion)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
