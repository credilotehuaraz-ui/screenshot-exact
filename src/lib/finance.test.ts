import { describe, expect, it } from "vitest";
import { computeSettlement, computeSettlementFromNumbers, computeWeekCaja, type DailyRecord } from "./finance";
import { fmt, parseMoney } from "./money";

const mockD1Records: DailyRecord[] = [
  { id: "r1", driverId: "d1", fecha: "2026-10-12", estado: "trabajado", produccion: 19429, abordo: 6059, recibido: 0, gasolina: [{ id: "g1", monto: 7225 }], peajes: 0, updatedAt: "", updatedBy: "" },
  { id: "r2", driverId: "d1", fecha: "2026-10-13", estado: "trabajado", produccion: 21000, abordo: 0, recibido: 0, gasolina: [{ id: "g2", monto: 6000 }], peajes: 0, updatedAt: "", updatedBy: "" },
  { id: "r3", driverId: "d1", fecha: "2026-10-14", estado: "trabajado", produccion: 23000, abordo: 0, recibido: 0, gasolina: [{ id: "g3", monto: 5000 }], peajes: 0, updatedAt: "", updatedBy: "" },
  { id: "r4", driverId: "d1", fecha: "2026-10-15", estado: "trabajado", produccion: 24000, abordo: 0, recibido: 0, gasolina: [{ id: "g4", monto: 4000 }], peajes: 0, updatedAt: "", updatedBy: "" },
  { id: "r5", driverId: "d1", fecha: "2026-10-16", estado: "trabajado", produccion: 24000, abordo: 0, recibido: 0, gasolina: [{ id: "g5", monto: 3000 }], peajes: 0, updatedAt: "", updatedBy: "" },
  { id: "r6", driverId: "d1", fecha: "2026-10-17", estado: "trabajado", produccion: 23879, abordo: 0, recibido: 0, gasolina: [{ id: "g6", monto: 2000 }], peajes: 0, updatedAt: "", updatedBy: "" },
];

describe("liquidación semanal (ejemplo oficial 12–18 oct)", () => {
  const s = computeSettlement("2026-10-12", mockD1Records, "2026-10-20");
  it("producción total y días trabajados", () => {
    expect(s.produccionTotal).toBe(135308);
    expect(s.diasTrabajados).toBe(6);
  });
  it("excedente = producción - 200 × días", () => expect(s.excedente).toBe(15308));
  it("participación = 40% del excedente", () => expect(s.participacion).toBe(6123));
  it("comisión fija = 70 × días", () => expect(s.comision).toBe(42000));
  it("ganancia = participación + comisión", () => expect(s.ganancia).toBe(48123));
  it("devolución de caja chica", () => expect(s.devolucion).toBe(21166));
  it("total por recibir", () => expect(s.totalRecibir).toBe(69289));
  it("día pendiente impide resultado definitivo", () => expect(s.definitivo).toBe(false));
});

describe("caja chica", () => {
  it("lunes: 0 + 60.59 + 0 - 72.25 - 0 = -11.66", () => {
    const c = computeWeekCaja(mockD1Records.filter((r) => r.fecha === "2026-10-12"));
    expect(c["2026-10-12"].cajaFinal).toBe(-1166);
    expect(c["2026-10-12"].devolucion).toBe(1166);
  });
  it("la semana empieza en S/ 0.00", () => {
    const c = computeWeekCaja(mockD1Records.filter((r) => r.fecha === "2026-10-12"));
    expect(c["2026-10-12"].cajaAnterior).toBe(0);
  });
});

describe("excedente negativo no se convierte en positivo", () => {
  it("3 días con S/ 500 → excedente -100, participación -40", () => {
    const r = computeSettlementFromNumbers(50000, 3);
    expect(r.excedente).toBe(-10000);
    expect(r.participacion).toBe(-4000);
    expect(r.ganancia).toBe(-4000 + 21000);
  });
});

describe("dinero", () => {
  it("formatea y parsea", () => {
    expect(fmt(135308)).toBe("S/ 1,353.08");
    expect(fmt(-1166)).toBe("-S/ 11.66");
    expect(parseMoney("194,29")).toBe(19429);
    expect(parseMoney("-5")).toBeNull();
  });
});
