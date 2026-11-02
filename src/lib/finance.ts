import { weekDays, type ISODate } from "./dates";
import type { Cents } from "./money";
import type { CashTransaction } from "./demo-data";

export const DAILY_BASE: Cents = 20000; // S/ 200.00 per worked day
export const FIXED_COMMISSION: Cents = 7000; // S/ 70.00 per worked day
export const DRIVER_SHARE_PCT = 40; // 40% of the surplus only

export type DayStatus = "trabajado" | "no_trabajado" | "pendiente";

export type ExpenseCategory = "gasolina" | "lavado" | "llanta" | "mantenimiento" | "otros";

export interface ExpenseItem {
  id: string;
  categoria: ExpenseCategory;
  monto: Cents;
  desc?: string;
}

export const expenseCategoryMeta: Record<ExpenseCategory, { label: string; icon: string }> = {
  gasolina: { label: "Gasolina", icon: "⛽" },
  lavado: { label: "Lavado de auto", icon: "🧼" },
  llanta: { label: "Pinchado / Llantas", icon: "🛞" },
  mantenimiento: { label: "Mantenimiento", icon: "🛠️" },
  otros: { label: "Otros gastos", icon: "📝" },
};

export interface FuelExpense {
  id: string;
  monto: Cents;
  desc?: string;
}

export interface DailyRecord {
  id: string;
  driverId: string;
  fecha: ISODate;
  estado: DayStatus;
  produccion: Cents;
  abordo: Cents;
  recibido: Cents;
  gasolina: FuelExpense[];
  gastos?: ExpenseItem[];
  peajes: Cents;
  obs?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CajaDay {
  fecha: ISODate;
  cajaAnterior: Cents;
  abordo: Cents;
  recibido: Cents;
  subtotal: Cents;
  gasolina: Cents;
  peajes: Cents;
  cajaFinal: Cents;
  devolucion: Cents;
}

export function getRecordExpenses(r: Pick<DailyRecord, "gasolina" | "gastos">): ExpenseItem[] {
  if (r.gastos && r.gastos.length > 0) return r.gastos;
  return (r.gasolina || []).map((g) => ({
    id: g.id,
    categoria: "gasolina",
    monto: g.monto,
    desc: g.desc,
  }));
}

export function fuelTotal(r: Pick<DailyRecord, "gasolina" | "gastos">): Cents {
  const list = getRecordExpenses(r);
  return list.reduce((s, g) => s + g.monto, 0);
}

/** Caja final = Caja anterior + A bordo + Efectivo recibido - Gastos Operativos Total - Peajes */
export function cajaStep(cajaAnterior: Cents, r: Pick<DailyRecord, "fecha" | "abordo" | "recibido" | "gasolina" | "gastos" | "peajes">): CajaDay {
  const gasolina = fuelTotal(r);
  const subtotal = cajaAnterior + r.abordo + r.recibido;
  const cajaFinal = subtotal - gasolina - r.peajes;
  return {
    fecha: r.fecha,
    cajaAnterior,
    abordo: r.abordo,
    recibido: r.recibido,
    subtotal,
    gasolina,
    peajes: r.peajes,
    cajaFinal,
    devolucion: cajaFinal < 0 ? -cajaFinal : 0,
  };
}

/** Chains petty cash through one week's records (week starts at S/ 0.00). Recomputes all later days. */
export function computeWeekCaja(weekRecords: DailyRecord[]): Record<ISODate, CajaDay> {
  const out: Record<ISODate, CajaDay> = {};
  let prev = 0;
  for (const r of [...weekRecords].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const d = cajaStep(prev, r);
    out[r.fecha] = d;
    prev = d.cajaFinal;
  }
  return out;
}

/** Caja anterior for a given date = caja final of the previous record in the same week. */
export function cajaAnteriorFor(weekRecords: DailyRecord[], fecha: ISODate): Cents {
  const before = weekRecords.filter((r) => r.fecha < fecha);
  if (!before.length) return 0;
  const caja = computeWeekCaja(before);
  const last = before.map((r) => r.fecha).sort().at(-1)!;
  return caja[last].cajaFinal;
}

/**
 * REGLA PRINCIPAL DE SIGNOS EN CAJA CHICA:
 * - POSITIVO (cajaFinal > 0): CONDUCTOR DEBE A LA EMPRESA
 * - NEGATIVO (cajaFinal < 0): LA EMPRESA DEBE AL CONDUCTOR
 * - CERO (cajaFinal = 0): CAJA CHICA AL DÍA (SIN DEUDA)
 *
 * Devuelve el saldo neto acumulado restando únicamente las transacciones que han sido APROBADAS o CONFIRMADAS.
 */
export function computeNetPendingBalance(cajaFinal: Cents, transactions: CashTransaction[] = []): {
  cajaFinal: Cents;
  devolucionPendiente: Cents;
  deudaEmpresaAConductor: Cents;
  deudaConductorAEmpresa: Cents;
  aprobadoTotal: Cents;
} {
  const approvedDevoluciones = transactions
    .filter((t) => t.tipo === "devolucion_conductor" && (t.estado === "aprobado" || t.estado === "confirmado"))
    .reduce((s, t) => s + t.monto, 0);

  const approvedReembolsos = transactions
    .filter((t) => t.tipo === "reembolso_empresa" && (t.estado === "aprobado" || t.estado === "confirmado"))
    .reduce((s, t) => s + t.monto, 0);

  let devolucionPendiente = 0;
  let deudaEmpresaAConductor = 0;
  let deudaConductorAEmpresa = 0;

  if (cajaFinal > 0) {
    // POSITIVO = CONDUCTOR DEBE A LA EMPRESA
    const neto = cajaFinal - approvedDevoluciones;
    deudaConductorAEmpresa = neto > 0 ? neto : 0;
    devolucionPendiente = deudaConductorAEmpresa;
  } else if (cajaFinal < 0) {
    // NEGATIVO = EMPRESA DEBE AL CONDUCTOR
    const bruto = Math.abs(cajaFinal);
    const neto = bruto - approvedReembolsos;
    deudaEmpresaAConductor = neto > 0 ? neto : 0;
    devolucionPendiente = deudaEmpresaAConductor;
  }

  return {
    cajaFinal,
    devolucionPendiente,
    deudaEmpresaAConductor,
    deudaConductorAEmpresa,
    aprobadoTotal: cajaFinal > 0 ? approvedDevoluciones : approvedReembolsos,
  };
}

function roundCents(x: number): Cents {
  return Math.sign(x) * Math.round(Math.abs(x));
}

export type DayState = DayStatus | "sin_datos" | "futuro";

export interface Settlement {
  dias: { fecha: ISODate; estado: DayState; produccion: Cents; record?: DailyRecord }[];
  produccionTotal: Cents;
  diasTrabajados: number;
  descuento: Cents;
  excedente: Cents;
  participacion: Cents;
  comision: Cents;
  ganancia: Cents;
  cajaFinal: Cents;
  devolucion: Cents;
  totalRecibir: Cents;
  pendientes: number;
  sinDatos: number;
  futuros: number;
  definitivo: boolean;
}

export function computeSettlementFromNumbers(produccionTotal: Cents, diasTrabajados: number) {
  const descuento = DAILY_BASE * diasTrabajados;
  const excedente = produccionTotal - descuento; // may be negative — never flipped
  const participacion = roundCents((excedente * DRIVER_SHARE_PCT) / 100);
  const comision = FIXED_COMMISSION * diasTrabajados;
  return { descuento, excedente, participacion, comision, ganancia: participacion + comision };
}

export function computeSettlement(start: ISODate, driverRecords: DailyRecord[], today: ISODate): Settlement {
  const days = weekDays(start);
  const weekRecs = driverRecords.filter((r) => r.fecha >= days[0] && r.fecha <= days[6]);
  const byDate = new Map(weekRecs.map((r) => [r.fecha, r]));
  const dias = days.map((fecha) => {
    const record = byDate.get(fecha);
    const estado: DayState = record ? record.estado : fecha > today ? "futuro" : "sin_datos";
    return { fecha, estado, produccion: record?.estado === "trabajado" ? record.produccion : 0, record };
  });
  const worked = dias.filter((d) => d.estado === "trabajado");
  const produccionTotal = worked.reduce((s, d) => s + d.produccion, 0);
  const diasTrabajados = worked.length;
  const base = computeSettlementFromNumbers(produccionTotal, diasTrabajados);
  const caja = computeWeekCaja(weekRecs);
  const lastDate = weekRecs.map((r) => r.fecha).sort().at(-1);
  const cajaFinal = lastDate ? caja[lastDate].cajaFinal : 0;
  const devolucion = cajaFinal < 0 ? -cajaFinal : 0;
  const pendientes = dias.filter((d) => d.estado === "pendiente").length;
  const sinDatos = dias.filter((d) => d.estado === "sin_datos").length;
  const futuros = dias.filter((d) => d.estado === "futuro").length;
  return {
    dias,
    produccionTotal,
    diasTrabajados,
    ...base,
    cajaFinal,
    devolucion,
    totalRecibir: base.ganancia + devolucion,
    pendientes,
    sinDatos,
    futuros,
    definitivo: pendientes === 0 && sinDatos === 0 && futuros === 0,
  };
}
