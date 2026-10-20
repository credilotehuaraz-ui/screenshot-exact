import type { DailyRecord, DayStatus } from "./finance";

export interface Driver {
  id: string;
  nombre: string;
  usuario: string;
  email: string;
  placa: string;
  activo: boolean;
  creado: string;
  /** DEMO ONLY: never shown in UI. Real app must hash passwords server-side. */
  password: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  by: string;
  driverId: string;
  fecha: string;
  accion: string;
}

const S = (soles: number) => Math.round(soles * 100);
let n = 0;

function r(
  driverId: string,
  fecha: string,
  estado: DayStatus,
  produccion = 0,
  abordo = 0,
  gas: number[] = [],
  peajes = 0,
  recibido = 0,
  obs = "",
): DailyRecord {
  n++;
  return {
    id: `rec-${n}`,
    driverId,
    fecha,
    estado,
    produccion: S(produccion),
    abordo: S(abordo),
    recibido: S(recibido),
    gasolina: gas.map((g, i) => ({ id: `g-${n}-${i}`, monto: S(g), desc: i === 0 ? "Grifo" : "" })),
    peajes: S(peajes),
    obs,
    updatedAt: `${fecha}T23:30:00-05:00`,
    updatedBy: "Demo",
  };
}

export const demoDrivers: Driver[] = [
  { id: "d1", nombre: "Juan Pérez Quispe", usuario: "jperez", email: "jperez@demo.pe", placa: "BXR-482", activo: true, creado: "2026-08-03", password: "1234" },
  { id: "d2", nombre: "María Rojas Salazar", usuario: "mrojas", email: "mrojas@demo.pe", placa: "CDK-917", activo: true, creado: "2026-08-17", password: "1234" },
  { id: "d3", nombre: "Luis Huamán Torres", usuario: "lhuaman", email: "lhuaman@demo.pe", placa: "AWT-305", activo: false, creado: "2026-06-21", password: "1234" },
];

export const demoRecords: DailyRecord[] = [
  // d1 — semana 5–11 oct (domingo sin datos)
  r("d1", "2026-10-05", "trabajado", 210.5, 55, [50]),
  r("d1", "2026-10-06", "trabajado", 245.1, 62.3, [30, 25.5]),
  r("d1", "2026-10-07", "no_trabajado"),
  r("d1", "2026-10-08", "trabajado", 230, 48, [40], 5.5),
  r("d1", "2026-10-09", "trabajado", 260.4, 70, [35, 30], 0, 20),
  r("d1", "2026-10-10", "trabajado", 198.75, 40.5, [45]),
  // d1 — semana 12–18 oct (ejemplo oficial de liquidación)
  r("d1", "2026-10-12", "trabajado", 194.29, 60.59, [20, 29.75, 22.5]),
  r("d1", "2026-10-13", "trabajado", 283.72, 80, [35, 25]),
  r("d1", "2026-10-14", "trabajado", 272.69, 50, [55], 5),
  r("d1", "2026-10-15", "pendiente", 0, 0, [], 0, 0, "Falta confirmar si se trabajó"),
  r("d1", "2026-10-16", "trabajado", 201.09, 40, [25, 20]),
  r("d1", "2026-10-17", "trabajado", 212.28, 70, [30, 30], 6.2),
  r("d1", "2026-10-18", "trabajado", 189.01, 30, [32.88]),
  // d1 — semana actual
  r("d1", "2026-10-19", "trabajado", 221.4, 58.2, [40]),
  // d2
  r("d2", "2026-10-12", "trabajado", 180, 50, [45]),
  r("d2", "2026-10-13", "trabajado", 175.5, 40, [52], 6.2),
  r("d2", "2026-10-14", "trabajado", 205, 65, [40]),
  r("d2", "2026-10-15", "no_trabajado"),
  r("d2", "2026-10-16", "trabajado", 230.8, 60, [30, 28]),
  r("d2", "2026-10-17", "trabajado", 190, 45, [50]),
  r("d2", "2026-10-19", "trabajado", 160.3, 35, [48], 6.2),
];

export const demoAudit: AuditEntry[] = [
  { id: "a1", at: "2026-10-19T22:10:00-05:00", by: "Juan Pérez Quispe", driverId: "d1", fecha: "2026-10-19", accion: "Creó registro" },
  { id: "a2", at: "2026-10-19T21:42:00-05:00", by: "María Rojas Salazar", driverId: "d2", fecha: "2026-10-19", accion: "Creó registro" },
  { id: "a3", at: "2026-10-18T10:05:00-05:00", by: "Administrador", driverId: "d1", fecha: "2026-10-17", accion: "Corrigió peajes (S/ 0.00 → S/ 6.20)" },
];
