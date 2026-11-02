export interface Driver {
  id: string;
  nombre: string;
  usuario: string;
  email: string;
  placa: string;
  activo: boolean;
  creado: string;
  password: string;
}

export interface AdminUser {
  id: string;
  nombre: string;
  usuario: string;
  email: string;
  activo: boolean;
  creado: string;
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

export type TransactionType = "devolucion_conductor" | "reembolso_empresa" | "recordatorio_empresa" | "solicitud_conductor";
export type TransactionStatus = "pendiente" | "comprobante_enviado" | "en_revision" | "aprobado" | "confirmado" | "rechazado" | "no_encontrado";

export interface CashTransaction {
  id: string;
  driverId: string;
  tipo: TransactionType;
  monto: number;
  estado: TransactionStatus;
  fecha: string;
  obs?: string;
  createdAt: string;
  updatedBy?: string;
}

export const demoDrivers: Driver[] = [];
export const demoRecords: any[] = [];
export const demoAudit: AuditEntry[] = [];
