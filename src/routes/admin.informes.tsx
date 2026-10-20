import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Section, WeekSelector, Money, cashTone } from "@/components/app/primitives";
import { useApp } from "@/lib/store";
import { computeSettlement } from "@/lib/finance";
import { addDays, formatWeekRange, todayLima, weekStart } from "@/lib/dates";
import { downloadCsv } from "@/lib/export";

export const Route = createFileRoute("/admin/informes")({
  component: Informes,
});

function Informes() {
  const { drivers, records } = useApp();
  const today = todayLima();
  const [week, setWeek] = useState(addDays(weekStart(today), -7));
  const list = drivers.filter((d) => d.activo);
  const rows = useMemo(() => list.map((d) => ({ d, s: computeSettlement(week, records.filter((r) => r.driverId === d.id), today) })), [list, records, week, today]);
  const weeks = [0, 1, 2, 3].map((i) => addDays(week, -7 * i)).reverse();
  const hist = useMemo(() => list.map((d) => ({ d, ss: weeks.map((w) => computeSettlement(w, records.filter((r) => r.driverId === d.id), today)) })), [list, records, weeks.join(), today]);

  const exportCsv = () => {
    const n = (c: number) => (c / 100).toFixed(2);
    downloadCsv(`produccion-${week}.csv`, [
      ["Conductor", "Placa", "Días", "Producción", "Ganancia", "Devolución", "Total por recibir", "Definitivo"],
      ...rows.map(({ d, s }) => [d.nombre, d.placa, String(s.diasTrabajados), n(s.produccionTotal), n(s.ganancia), n(s.devolucion), n(s.totalRecibir), s.definitivo ? "Sí" : "No"]),
    ]);
  };

  return (
    <div>
      <PageHeader title="Informes generales" right={<Button size="sm" variant="outline" onClick={exportCsv}><Download /> CSV</Button>} />
      <div className="space-y-3 p-4">
        <WeekSelector value={week} onChange={setWeek} />
        <Section title="Producción por conductor">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b text-right"><th className="py-1.5 text-left font-medium">Conductor</th><th className="font-medium">Días</th><th className="font-medium">Producción</th><th className="font-medium">Ganancia</th><th className="font-medium">Total</th></tr>
              </thead>
              <tbody>
                {rows.map(({ d, s }) => (
                  <tr key={d.id} className="border-b text-right last:border-0">
                    <td className="py-2 text-left"><div className="font-medium">{d.nombre.split(" ").slice(0, 2).join(" ")}</div><div className="text-muted-foreground">{d.placa}{!s.definitivo && " · prov."}</div></td>
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
              <thead className="text-muted-foreground"><tr className="border-b text-right"><th className="py-1.5 text-left font-medium">Conductor</th>{weeks.map((w) => <th key={w} className="font-medium">{formatWeekRange(w).split(" – ")[0]}</th>)}</tr></thead>
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

        <Section title="Historial de liquidaciones (total por recibir)">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground"><tr className="border-b text-right"><th className="py-1.5 text-left font-medium">Conductor</th>{weeks.map((w) => <th key={w} className="font-medium">{formatWeekRange(w).split(" – ")[0]}</th>)}</tr></thead>
              <tbody>
                {hist.map(({ d, ss }) => (
                  <tr key={d.id} className="border-b text-right last:border-0">
                    <td className="py-2 text-left font-medium">{d.nombre.split(" ")[0]}</td>
                    {ss.map((s, i) => <td key={i} className="num">{(s.totalRecibir / 100).toFixed(2)}</td>)}
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
      </div>
    </div>
  );
}
