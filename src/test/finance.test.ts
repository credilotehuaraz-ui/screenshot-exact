import { describe, it, expect } from "vitest";
import {
  computeNetPendingBalance,
  computeSettlement,
  getRecordExpenses,
  fuelTotal,
  DAILY_BASE,
  FIXED_COMMISSION,
  DRIVER_SHARE_PCT,
} from "@/lib/finance";
import type { CashTransaction, DailyRecord } from "@/lib/demo-data";

describe("Motor Financiero - Regla por Signo de Caja Chica y Amortizaciones", () => {
  it("Prueba A: Saldo Positivo (+S/ 100.00) -> Conductor debe a Empresa", () => {
    const cajaFinal = 10000; // S/ 100.00 en centavos
    const txs: CashTransaction[] = [];

    // 1. Inicialmente sin amortizaciones verificadas
    const res1 = computeNetPendingBalance(cajaFinal, txs);
    expect(res1.deudaConductorAEmpresa).toBe(10000);
    expect(res1.devolucionPendiente).toBe(10000);

    // 2. Conductor envía comprobante por S/ 60.00 en estado 'comprobante_enviado' (NO reduce la deuda aún)
    txs.push({
      id: "tx-1",
      driverId: "d-1",
      tipo: "devolucion_conductor",
      monto: 6000,
      estado: "comprobante_enviado",
      fecha: "2026-11-02",
      createdAt: new Date().toISOString(),
    });

    const res2 = computeNetPendingBalance(cajaFinal, txs);
    expect(res2.devolucionPendiente).toBe(10000); // Se mantiene en S/ 100.00

    // 3. Admin aprueba el comprobante
    txs[0].estado = "aprobado";
    const res3 = computeNetPendingBalance(cajaFinal, txs);
    expect(res3.devolucionPendiente).toBe(4000); // Queda S/ 40.00 pendiente
  });

  it("Prueba B: Saldo Negativo (-S/ 100.00) -> Empresa debe al Conductor", () => {
    const cajaFinal = -10000; // -S/ 100.00 en centavos
    const txs: CashTransaction[] = [];

    // 1. Inicialmente sin amortización
    const res1 = computeNetPendingBalance(cajaFinal, txs);
    expect(res1.deudaEmpresaAConductor).toBe(10000);
    expect(res1.devolucionPendiente).toBe(10000);

    // 2. Admin registra depósito por S/ 60.00 en estado 'pendiente'
    txs.push({
      id: "tx-2",
      driverId: "d-1",
      tipo: "reembolso_empresa",
      monto: 6000,
      estado: "pendiente",
      fecha: "2026-11-02",
      createdAt: new Date().toISOString(),
    });

    const res2 = computeNetPendingBalance(cajaFinal, txs);
    expect(res2.devolucionPendiente).toBe(10000); // Se mantiene en S/ 100.00 hasta que el conductor confirme

    // 3. Conductor confirma la recepción
    txs[0].estado = "confirmado";
    const res3 = computeNetPendingBalance(cajaFinal, txs);
    expect(res3.devolucionPendiente).toBe(4000); // Queda S/ 40.00 pendiente
  });

  it("Prueba C: Saldo Cero (S/ 0.00) -> Caja chica al día", () => {
    const cajaFinal = 0;
    const res = computeNetPendingBalance(cajaFinal, []);
    expect(res.deudaConductorAEmpresa).toBe(0);
    expect(res.deudaEmpresaAConductor).toBe(0);
    expect(res.devolucionPendiente).toBe(0);
  });

  it("Vinculación por Periodo Seccional", () => {
    const cajaFinal = 10000;
    const txs: CashTransaction[] = [
      {
        id: "tx-w1",
        driverId: "d-1",
        period_id: "2026-10-26",
        tipo: "devolucion_conductor",
        monto: 5000,
        estado: "aprobado",
        fecha: "2026-10-28",
        createdAt: new Date().toISOString(),
      },
      {
        id: "tx-w2",
        driverId: "d-1",
        period_id: "2026-11-02",
        tipo: "devolucion_conductor",
        monto: 3000,
        estado: "aprobado",
        fecha: "2026-11-03",
        createdAt: new Date().toISOString(),
      },
    ];

    // Para la semana de Nov 02 sólo aplica tx-w2
    const resPeriod = computeNetPendingBalance(cajaFinal, txs, "2026-11-02");
    expect(resPeriod.devolucionPendiente).toBe(7000); // 10000 - 3000
  });

  it("Persistencia y Totalización de Categorías de Gastos Operativos", () => {
    const record: Partial<DailyRecord> = {
      gasolina: [{ id: "g1", monto: 5000, desc: "⛽ Gasolina" }],
      gastos: [
        { id: "g1", categoria: "gasolina", monto: 5000, desc: "⛽ Gasolina" },
        { id: "g2", categoria: "lavado", monto: 2000, desc: "🧼 Lavado" },
        { id: "g3", categoria: "mantenimiento", monto: 3000, desc: "🛠️ Mantenimiento" },
      ],
    };

    const expenses = getRecordExpenses(record as DailyRecord);
    expect(expenses).toHaveLength(3);
    expect(fuelTotal(record as DailyRecord)).toBe(10000); // S/ 100.00
  });
});
