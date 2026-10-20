import { computeWeekCaja, type Settlement } from "./finance";
import type { Driver } from "./demo-data";

const n = (c: number) => (c / 100).toFixed(2);

export function settlementCsv(s: Settlement, driver: Driver): string[][] {
  const caja = computeWeekCaja(s.dias.flatMap((d) => (d.record ? [d.record] : [])));
  const rows: string[][] = [["Conductor", driver.nombre, "Placa", driver.placa], [], ["Fecha", "Estado", "Producción", "A bordo", "Recibido", "Gasolina", "Peajes", "Caja final"]];
  for (const d of s.dias) {
    const c = caja[d.fecha];
    rows.push(d.record && c ? [d.fecha, d.estado, n(d.record.produccion), n(d.record.abordo), n(d.record.recibido), n(c.gasolina), n(d.record.peajes), n(c.cajaFinal)] : [d.fecha, d.estado]);
  }
  rows.push([], ["Producción total", n(s.produccionTotal)], ["Días trabajados", String(s.diasTrabajados)], ["Excedente", n(s.excedente)], ["Participación", n(s.participacion)], ["Comisión", n(s.comision)], ["Ganancia", n(s.ganancia)], ["Devolución", n(s.devolucion)], ["Total por recibir", n(s.totalRecibir)]);
  return rows;
}

export function downloadCsv(name: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
