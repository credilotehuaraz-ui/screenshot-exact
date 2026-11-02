import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Receipt, Fuel, Sparkles, Disc, Wrench, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Section, WeekSelector, Money, StatCard, cashTone } from "@/components/app/primitives";
import { useApp } from "@/lib/store";
import { computeSettlement, getRecordExpenses, expenseCategoryMeta, type ExpenseCategory } from "@/lib/finance";
import { addDays, formatShort, formatWeekRange, todayLima, weekDays, weekStart } from "@/lib/dates";
import { downloadCsv } from "@/lib/export";

export const Route = createFileRoute("/admin/informes")({
  component: Informes,
});

export function Informes() {
  const { drivers, records } = useApp();
  const today = todayLima();
  const [week, setWeek] = useState(addDays(weekStart(today), -7));
  const [selectedDriverFilter, setSelectedDriverFilter] = useState("todos");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("todas");

  const list = drivers.filter((d) => d.activo);
  const rows = useMemo(() => list.map((d) => ({ d, s: computeSettlement(week, records.filter((r) => r.driverId === d.id), today) })), [list, records, week, today]);
  const weeks = [0, 1, 2, 3].map((i) => addDays(week, -7 * i)).reverse();
  const hist = useMemo(() => list.map((d) => ({ d, ss: weeks.map((w) => computeSettlement(w, records.filter((r) => r.driverId === d.id), today)) })), [list, records, weeks.join(), today]);

  // Días de la semana seleccionada
  const currentWeekDays = useMemo(() => weekDays(week), [week]);

  // Todos los gastos desglosados de la semana seleccionada
  const allExpenses = useMemo(() => {
    const items: Array<{
      id: string;
      fecha: string;
      driverId: string;
      driverName: string;
      placa: string;
      categoria: ExpenseCategory;
      desc: string;
      monto: number;
    }> = [];

    records.forEach((r) => {
      if (currentWeekDays.includes(r.fecha)) {
        const d = drivers.find((x) => x.id === r.driverId);
        if (d && (selectedDriverFilter === "todos" || d.id === selectedDriverFilter)) {
          const expList = getRecordExpenses(r);
          expList.forEach((e) => {
            if (selectedCategoryFilter === "todas" || e.categoria === selectedCategoryFilter) {
              items.push({
                id: e.id,
                fecha: r.fecha,
                driverId: d.id,
                driverName: d.nombre,
                placa: d.placa,
                categoria: e.categoria,
                desc: e.desc || expenseCategoryMeta[e.categoria].label,
                monto: e.monto,
              });
            }
          });
        }
      }
    });

    return items.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [records, drivers, currentWeekDays, selectedDriverFilter, selectedCategoryFilter]);

  // Totales de gastos por categoría
  const expenseSummary = useMemo(() => {
    const catTotals: Record<ExpenseCategory, number> = {
      gasolina: 0,
      lavado: 0,
      llanta: 0,
      mantenimiento: 0,
      otros: 0,
    };

    allExpenses.forEach((e) => {
      catTotals[e.categoria] = (catTotals[e.categoria] || 0) + e.monto;
    });

    const totalGeneral = Object.values(catTotals).reduce((a, b) => a + b, 0);

    return { catTotals, totalGeneral };
  }, [allExpenses]);

  const exportCsv = () => {
    const n = (c: number) => (c / 100).toFixed(2);
    downloadCsv(`produccion-${week}.csv`, [
      ["Conductor", "Placa", "Días", "Producción", "Ganancia", "Devolución", "Total por recibir", "Definitivo"],
      ...rows.map(({ d, s }) => [d.nombre, d.placa, String(s.diasTrabajados), n(s.produccionTotal), n(s.ganancia), n(s.devolucion), n(s.totalRecibir), s.definitivo ? "Sí" : "No"]),
    ]);
  };

  const exportExpensesCsv = () => {
    const n = (c: number) => (c / 100).toFixed(2);
    downloadCsv(`reporte-gastos-${week}.csv`, [
      ["Fecha", "Conductor", "Placa", "Categoría", "Descripción", "Monto S/"],
      ...allExpenses.map((e) => [e.fecha, e.driverName, e.placa, expenseCategoryMeta[e.categoria].label, e.desc, n(e.monto)]),
    ]);
  };

  return (
    <div>
      <PageHeader
        title="Informes generales"
        right={
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download /> CSV Producción
          </Button>
        }
      />

      <div className="space-y-3 p-4">
        <WeekSelector value={week} onChange={setWeek} />

        <Tabs defaultValue="gastos">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gastos">Reporte de Gastos</TabsTrigger>
            <TabsTrigger value="produccion">Producción Flota</TabsTrigger>
          </TabsList>

          {/* Tab 1: Reporte Detallado de Gastos por Conductor */}
          <TabsContent value="gastos" className="space-y-3 pt-2">
            <Section title="Filtros de consulta">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold uppercase text-muted-foreground block mb-1">Conductor</label>
                  <select
                    value={selectedDriverFilter}
                    onChange={(e) => setSelectedDriverFilter(e.target.value)}
                    className="h-10 w-full rounded-lg border bg-background px-2 text-xs font-medium"
                  >
                    <option value="todos">Todos los conductores</option>
                    {list.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre} ({d.placa})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase text-muted-foreground block mb-1">Categoría</label>
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="h-10 w-full rounded-lg border bg-background px-2 text-xs font-medium"
                  >
                    <option value="todas">Todas las categorías</option>
                    {Object.entries(expenseCategoryMeta).map(([catKey, meta]) => (
                      <option key={catKey} value={catKey}>
                        {meta.icon} {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Section>

            {/* Tarjetas de Resumen de Gastos */}
            <div className="grid grid-cols-2 gap-2">
              <StatCard className="col-span-2" icon={Receipt} label="Total Gastos Operativos" value={(expenseSummary.totalGeneral / 100).toFixed(2)} hint={`${allExpenses.length} comprobante(s) registrado(s)`} tone="negative" />
              <StatCard icon={Fuel} label="Gasolina" value={(expenseSummary.catTotals.gasolina / 100).toFixed(2)} />
              <StatCard icon={Sparkles} label="Lavado auto" value={(expenseSummary.catTotals.lavado / 100).toFixed(2)} />
              <StatCard icon={Disc} label="Pinchados/Llantas" value={(expenseSummary.catTotals.llanta / 100).toFixed(2)} />
              <StatCard icon={Wrench} label="Mantenimiento" value={(expenseSummary.catTotals.mantenimiento / 100).toFixed(2)} />
            </div>

            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={exportExpensesCsv}>
                <Download className="mr-1 size-3.5" /> Exportar Reporte de Gastos (CSV)
              </Button>
            </div>

            {/* Tabla Detallada de Gastos */}
            <Section title={`Detalle de comprobantes (${allExpenses.length})`}>
              {allExpenses.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No hay gastos operativos registrados para la semana y filtros seleccionados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                      <tr className="border-b text-left">
                        <th className="py-2 font-medium">Fecha</th>
                        <th className="font-medium">Conductor</th>
                        <th className="font-medium">Categoría</th>
                        <th className="font-medium">Descripción</th>
                        <th className="text-right font-medium">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allExpenses.map((e) => (
                        <tr key={e.id} className="text-left">
                          <td className="py-2 font-semibold text-foreground whitespace-nowrap">{formatShort(e.fecha)}</td>
                          <td className="whitespace-nowrap">
                            <div className="font-medium">{e.driverName.split(" ")[0]}</div>
                            <div className="text-[10px] text-muted-foreground">{e.placa}</div>
                          </td>
                          <td className="whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] font-bold">
                              {expenseCategoryMeta[e.categoria].icon} {expenseCategoryMeta[e.categoria].label}
                            </span>
                          </td>
                          <td className="max-w-[140px] truncate text-muted-foreground">{e.desc}</td>
                          <td className="text-right num font-bold text-negative whitespace-nowrap">S/ {(e.monto / 100).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </TabsContent>

          {/* Tab 2: Producción General Flota */}
          <TabsContent value="produccion" className="space-y-3 pt-2">
            <Section title="Producción por conductor">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr className="border-b text-right">
                      <th className="py-1.5 text-left font-medium">Conductor</th>
                      <th className="font-medium">Días</th>
                      <th className="font-medium">Producción</th>
                      <th className="font-medium">Ganancia</th>
                      <th className="font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ d, s }) => (
                      <tr key={d.id} className="border-b text-right last:border-0">
                        <td className="py-2 text-left">
                          <div className="font-medium">{d.nombre.split(" ").slice(0, 2).join(" ")}</div>
                          <div className="text-muted-foreground">{d.placa}{!s.definitivo && " · prov."}</div>
                        </td>
                        <td className="num">{s.diasTrabajados}</td>
                        <td><Money c={s.produccionTotal} /></td>
                        <td><Money c={s.ganancia} tone="primary" /></td>
                        <td><Money c={s.totalRecibir} className="font-semibold" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Comparación semanal de producción">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr className="border-b text-right">
                      <th className="py-1.5 text-left font-medium">Conductor</th>
                      {weeks.map((w) => (
                        <th key={w} className="font-medium">{formatWeekRange(w).split(" – ")[0]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hist.map(({ d, ss }) => (
                      <tr key={d.id} className="border-b text-right last:border-0">
                        <td className="py-2 text-left font-medium">{d.nombre.split(" ")[0]}</td>
                        {ss.map((s, i) => <td key={i} className="num">{(s.produccionTotal / 100).toFixed(2)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Devoluciones pendientes">
              {rows.map(({ d, s }) => (
                <div key={d.id} className="flex justify-between py-1.5 text-sm">
                  <span>{d.nombre}</span>
                  <Money c={s.devolucion ? s.devolucion : s.cajaFinal} tone={s.devolucion ? "negative" : cashTone(s.cajaFinal)} />
                </div>
              ))}
            </Section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
