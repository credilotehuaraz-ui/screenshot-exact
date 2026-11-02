import { computeWeekCaja, fuelTotal, getRecordExpenses, type Settlement } from "@/lib/finance";
import { fmt } from "@/lib/money";
import { dayName, formatLong, formatShort, formatWeekRange } from "@/lib/dates";
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
      <span className={cn("num font-medium", tone && toneText[tone])}>{value}</span>
    </div>
  );
}

/** Detailed per-day cards (mobile). */
export function ReportDetailed({ s }: { s: Settlement }) {
  const rows = useRows(s);
  return (
    <div className="space-y-3">
      {rows.map((d) => {
        const expenses = d.record ? getRecordExpenses(d.record) : [];
        return (
          <div key={d.fecha} className={cn("surface p-3.5", !d.record && "border-dashed bg-background shadow-none")}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold capitalize">{formatShort(d.fecha)}</span>
              <StatusBadge estado={d.estado} />
            </div>
            {d.record && d.caja ? (
              <div className="space-y-2 text-xs">
                <Cell label="Producción" value={fmt(d.record.produccion)} />
                <Cell label="Dinero a bordo" value={fmt(d.record.abordo)} />
                <Cell label="Dinero recibido" value={fmt(d.record.recibido)} />

                {expenses.length > 0 && (
                  <div className="rounded-lg bg-muted/60 p-2 space-y-1">
                    <p className="text-[11px] font-bold text-muted-foreground">Gastos Operativos:</p>
                    {expenses.map((g) => (
                      <div key={g.id} className="flex justify-between text-[11px]">
                        <span>{g.desc || g.categoria}:</span>
                        <span className="font-semibold">{fmt(g.monto)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Cell label="Peajes" value={fmt(d.record.peajes)} />
                <div className="border-t border-dashed pt-1">
                  <Cell label="Caja final del día" value={fmt(d.caja.cajaFinal)} tone={cashTone(d.caja.cajaFinal)} />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{d.estado === "futuro" ? "Día aún no transcurrido." : "No hay registro. No se asume día libre."}</p>
            )}
          </div>
        );
      })}
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

/** Compact table for export. */
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
            <th className="font-medium">Gastos</th>
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

/**
 * PLANTILLA OFICIAL DE EXPORTACIÓN Y VISTA PANORÁMICA CABIFY
 * Soporta hasta los 7 días trabajados completos (Lunes a Domingo) y exportación A4 Horizontal.
 */
export function ReportPanoramic({ s, driver }: { s: Settlement; driver: Driver }) {
  const rows = useRows(s);
  const weekRangeText = formatWeekRange(s.dias[0].fecha);

  // Filtrar solo días efectivamente trabajados o con registro cargado
  const workedDays = rows.filter((d) => d.record && d.estado === "trabajado");
  const displayDays = workedDays.length > 0 ? workedDays : rows.filter((d) => d.record || d.estado !== "futuro");

  return (
    <div className="report-panoramic-container overflow-x-auto rounded-xl border bg-slate-100 p-2 shadow-sm">
      <div className="report-panoramic-inner w-[1240px] bg-white text-slate-900 font-sans p-0 overflow-hidden rounded-lg border shadow">

        {/* Banner Superior Oficial Cabify */}
        <div className="bg-[#002845] text-white px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black tracking-tighter text-white">cabify</span>
            <span className="text-2xl font-light text-slate-400">|</span>
            <span className="text-lg font-extrabold uppercase tracking-wide">
              CONTROL SEMANAL - PRODUCCIÓN, CAJA CHICA Y LIQUIDACIÓN
            </span>
          </div>
          <span className="text-sm italic font-medium text-slate-200">
            Tu esfuerzo también cuenta
          </span>
        </div>

        {/* Contenido Principal Grid: Tarjetas Diarias (hasta 7 días) + Panel Lateral de Resumen */}
        <div className="p-4 grid grid-cols-4 gap-3 bg-slate-50">

          {/* Grid para las tarjetas diarias (hasta 7 días) */}
          <div className="col-span-3 grid grid-cols-3 gap-3">
            {displayDays.slice(0, 7).map((d) => {
              const expenses = d.record ? getRecordExpenses(d.record) : [];
              const expTotal = expenses.reduce((a, b) => a + b.monto, 0);

              return (
                <div key={d.fecha} className="flex flex-col justify-between rounded-xl border border-[#0088cc]/40 bg-white p-3 shadow-xs">
                  {/* Nombre del Día y Fecha */}
                  <div>
                    <div className="text-xs font-extrabold text-[#002845] uppercase tracking-wide border-b border-slate-100 pb-1 flex justify-between items-center">
                      <span>{dayName(d.fecha)} {formatLong(d.fecha).split(" ")[0]} DE {formatLong(d.fecha).split(" de ")[1]?.toUpperCase()}</span>
                    </div>

                    {d.record && d.caja ? (
                      <>
                        {/* Producción diaria */}
                        <div className="my-2 flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-700">Producción:</span>
                          <span className="text-[#008000] text-sm num">{fmt(d.record.produccion)}</span>
                        </div>

                        {/* Desglose a 2 columnas: Gastos (izq) y Caja chica (der) */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-slate-100 pt-2">

                          {/* Columna Izquierda: Gastos Operativos */}
                          <div className="space-y-1">
                            <span className="font-bold text-slate-800 text-[10px] uppercase">Gastos:</span>
                            {expenses.length === 0 ? (
                              <div className="text-slate-400 text-[10px] italic">Sin gastos</div>
                            ) : (
                              expenses.map((g, idx) => (
                                <div key={g.id} className="flex justify-between text-[10px] text-slate-600">
                                  <span>{idx === 0 ? "" : "+ "}S/ {(g.monto / 100).toFixed(2)}</span>
                                </div>
                              ))
                            )}
                            <div className="border-t border-emerald-600 pt-0.5 font-bold text-[#008000] text-[11px]">
                              S/ {(expTotal / 100).toFixed(2)}
                            </div>
                          </div>

                          {/* Columna Derecha: Caja Chica */}
                          <div className="space-y-0.5 text-right">
                            <span className="font-bold text-slate-800 text-[10px] uppercase block text-left">Caja chica:</span>
                            <div className="flex justify-between text-[10px] text-slate-600">
                              <span>Caja anterior</span>
                              <span className={d.caja.cajaAnterior < 0 ? "text-red-600 font-semibold" : ""}>{fmt(d.caja.cajaAnterior)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-600">
                              <span>A bordo</span>
                              <span>{fmt(d.record.abordo)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-600">
                              <span>+ Dinero recibido</span>
                              <span>{fmt(d.record.recibido)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-[#008000] border-t border-slate-100 pt-0.5">
                              <span>Subtotal</span>
                              <span>{fmt(d.caja.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-600">
                              <span>- Gastos</span>
                              <span>{fmt(d.caja.gasolina)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-600">
                              <span>- Peajes</span>
                              <span>{fmt(d.record.peajes)}</span>
                            </div>
                            <div className={cn("flex justify-between text-[11px] font-extrabold border-t border-slate-200 pt-0.5", d.caja.cajaFinal < 0 ? "text-red-600" : "text-[#008000]")}>
                              <span>CAJA FINAL</span>
                              <span>{fmt(d.caja.cajaFinal)}</span>
                            </div>
                          </div>

                        </div>
                      </>
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-400 italic">
                        {d.estado === "futuro" ? "Día sin transcurrir" : "Sin datos, no confirmado"}
                      </div>
                    )}
                  </div>

                  {/* Cuadro destacado al pie: Devolución pendiente */}
                  {d.record && d.caja && (
                    <div className="mt-2 rounded-lg bg-red-50 border border-red-200 p-1.5 text-center text-[11px] font-extrabold text-red-600">
                      Devolución pendiente: {fmt(d.caja.devolucion)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Panel Lateral Derecho: RESUMEN SEMANAL CABIFY */}
          <div className="col-span-1 rounded-xl border border-[#0088cc]/40 bg-white p-4 shadow-xs flex flex-col justify-between text-xs">
            <div>
              <h2 className="text-sm font-black text-[#002845] uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-3">
                RESUMEN SEMANAL CABIFY
              </h2>

              <div className="space-y-1 text-slate-700 font-medium mb-3 text-[11px]">
                <div className="flex justify-between">
                  <span>Placa:</span>
                  <span className="font-extrabold text-slate-900">{driver.placa}</span>
                </div>
                <div className="flex justify-between">
                  <span>Semana:</span>
                  <span className="font-semibold text-slate-900">{weekRangeText}</span>
                </div>
              </div>

              {/* Producción diaria individual */}
              <div className="border-t border-slate-100 pt-2 mb-3">
                <p className="font-extrabold text-slate-800 text-[11px] mb-1">Producción diaria</p>
                <div className="space-y-0.5 text-[11px]">
                  {rows.map((d) => (
                    <div key={d.fecha} className="flex justify-between text-slate-600">
                      <span className="capitalize">{dayName(d.fecha)}</span>
                      <span className={d.record ? "font-semibold text-slate-900" : "text-slate-400 italic"}>
                        {d.record ? fmt(d.record.produccion) : "Sin datos, no confirmado"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-black text-xs border-t border-slate-200 pt-1.5 mt-1.5 text-[#008000]">
                  <span>PRODUCCIÓN TOTAL:</span>
                  <span>{fmt(s.produccionTotal)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600 mt-1">
                  <span>Días trabajados:</span>
                  <span className="font-bold text-slate-900">{s.diasTrabajados}</span>
                </div>
              </div>

              {/* Liquidación Matemática */}
              <div className="border-t border-slate-100 pt-2 space-y-1 text-[10px]">
                <p className="font-extrabold text-slate-800 text-[11px]">Liquidación</p>
                <div className="flex justify-between text-slate-600">
                  <span>Producción total:</span>
                  <span className="font-semibold text-slate-900">{fmt(s.produccionTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Descuento por días (S/ 200 x {s.diasTrabajados}):</span>
                  <span>{fmt(s.descuento)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Excedente:</span>
                  <span>{fmt(s.excedente)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Mi 40% del excedente:</span>
                  <span className="font-semibold text-slate-900">{fmt(s.participacion)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Comisión fija (S/ 70 x {s.diasTrabajados}):</span>
                  <span className="font-semibold text-slate-900">{fmt(s.comision)}</span>
                </div>
                <div className="flex justify-between font-black text-xs text-[#008000] border-t border-slate-100 pt-1">
                  <span>GANANCIA SEMANAL:</span>
                  <span>{fmt(s.ganancia)}</span>
                </div>
              </div>

              {/* Devolución de caja chica */}
              <div className="border-t border-slate-100 pt-2 mt-2 space-y-0.5 text-[10px]">
                <p className="font-bold text-slate-800">Devolución de caja chica</p>
                <div className="flex justify-between text-slate-600">
                  <span>Caja chica final del domingo:</span>
                  <span className={s.cajaFinal < 0 ? "text-red-600 font-semibold" : ""}>{fmt(s.cajaFinal)}</span>
                </div>
                <div className="flex justify-between font-bold text-[#008000]">
                  <span>La empresa debe devolver:</span>
                  <span>{fmt(s.devolucion)}</span>
                </div>
              </div>
            </div>

            {/* Banner Azul Gigante TOTAL A RECIBIR */}
            <div className="mt-4 rounded-xl bg-[#002845] p-3 text-white text-center shadow-md">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                TOTAL A RECIBIR
              </div>
              <div className="text-[10px] text-slate-300 flex justify-center gap-2 my-0.5">
                <span>Ganancia: {fmt(s.ganancia)}</span>
                <span>+ Dev. Caja: {fmt(s.devolucion)}</span>
              </div>
              <div className="num text-2xl font-black tracking-tight text-white mt-1">
                {fmt(s.totalRecibir)}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
