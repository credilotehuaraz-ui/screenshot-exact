import { describe, it, expect } from "vitest";
import {
  computeNetPendingBalance,
  getRecordExpenses,
  fuelTotal,
} from "@/lib/finance";
import { fmt, parseMoney } from "@/lib/money";
import type { CashTransaction, DailyRecord } from "@/lib/demo-data";

describe("Motor Financiero y Fracciones Decimales de Gastos", () => {
  it("Parseo y formateo con fracciones decimales exactas (20.21, 22.35, 15.50)", () => {
    expect(parseMoney("20.21")).toBe(2021);
    expect(parseMoney("22.35")).toBe(2235);
    expect(parseMoney("15,50")).toBe(1550);
    expect(fmt(2021)).toBe("S/ 20.21");
    expect(fmt(2235)).toBe("S/ 22.35");
    expect(fmt(1550)).toBe("S/ 15.50");
  });

  it("Persistencia y Totalización de Categorías de Gastos Operativos con Fracciones", () => {
    const record: Partial<DailyRecord> = {
      gasolina: [{ id: "g1", monto: 2021, desc: "⛽ Gasolina" }],
      gastos: [
        { id: "g1", categoria: "gasolina", monto: 2021, desc: "⛽ Gasolina S/ 20.21" },
        { id: "g2", categoria: "lavado", monto: 2235, desc: "🧼 Lavado S/ 22.35" },
        { id: "g3", categoria: "mantenimiento", monto: 1550, desc: "🛠️ Mantenimiento S/ 15.50" },
      ],
    };

    const expenses = getRecordExpenses(record as DailyRecord);
    expect(expenses).toHaveLength(3);
    expect(fuelTotal(record as DailyRecord)).toBe(5806); // S/ 58.06
    expect(fmt(fuelTotal(record as DailyRecord))).toBe("S/ 58.06");
  });
});
