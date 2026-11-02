import { createClient } from "@supabase/supabase-js";
import type { DailyRecord } from "./finance";
import type { Driver, AdminUser, AuditEntry, CashTransaction } from "./demo-data";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("http"));
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

// ==========================================
// Funciones de Autenticación Supabase Auth
// ==========================================

export async function signInWithSupabaseAuth(email: string, password: string) {
  if (!supabase) return { data: null, error: new Error("Supabase no configurado") };
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signOutFromSupabaseAuth() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSupabaseSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function updateSupabasePassword(newPassword: string) {
  if (!supabase) return { error: new Error("Supabase no configurado") };
  return await supabase.auth.updateUser({ password: newPassword });
}

// ==========================================
// Adaptadores y Mapeos de Datos para Supabase
// ==========================================

export async function fetchDriversFromSupabase(): Promise<Driver[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("drivers").select("*").order("nombre");
  if (error) {
    console.error("Error cargando conductores desde Supabase:", error);
    return [];
  }
  return data.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    usuario: d.usuario,
    email: d.email,
    placa: d.placa,
    activo: d.activo,
    creado: d.creado,
    password: d.password,
  }));
}

export async function fetchAdminUsersFromSupabase(): Promise<AdminUser[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("admin_users").select("*").order("nombre");
  if (error) {
    console.error("Error cargando administradores desde Supabase:", error);
    return [];
  }
  return data.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    usuario: a.usuario,
    email: a.email,
    activo: a.activo,
    creado: a.creado,
    password: a.password,
  }));
}

export async function fetchRecordsFromSupabase(): Promise<DailyRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("daily_records").select("*").order("fecha", { ascending: false });
  if (error) {
    console.error("Error cargando registros desde Supabase:", error);
    return [];
  }
  return data.map((r) => ({
    id: r.id,
    driverId: r.driver_id,
    fecha: r.fecha,
    estado: r.estado,
    produccion: r.produccion,
    abordo: r.abordo,
    recibido: r.recibido,
    peajes: r.peajes,
    gasolina: Array.isArray(r.gasolina) ? r.gasolina : [],
    gastos: Array.isArray(r.gastos) ? r.gastos : (Array.isArray(r.gasolina) ? r.gasolina : []),
    obs: r.obs ?? "",
    updatedAt: r.updated_at,
    updatedBy: r.updated_by,
  }));
}

export async function fetchAuditFromSupabase(): Promise<AuditEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(100);
  if (error) {
    console.error("Error cargando historial de auditoría desde Supabase:", error);
    return [];
  }
  return data.map((a) => ({
    id: a.id,
    at: a.at,
    by: a.by_name,
    driverId: a.driver_id,
    fecha: a.fecha,
    accion: a.accion,
  }));
}

export async function fetchCashTransactionsFromSupabase(): Promise<CashTransaction[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("cash_transactions").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("Error cargando transacciones de caja desde Supabase:", error);
    return [];
  }
  return data.map((t) => ({
    id: t.id,
    driverId: t.driver_id,
    period_id: t.period_id ?? undefined,
    tipo: t.tipo,
    monto: t.monto,
    estado: t.estado,
    fecha: t.fecha,
    obs: t.obs ?? "",
    createdAt: t.created_at,
  }));
}

export async function saveRecordToSupabase(rec: DailyRecord): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("daily_records").upsert({
    id: rec.id,
    driver_id: rec.driverId,
    fecha: rec.fecha,
    estado: rec.estado,
    produccion: rec.produccion,
    abordo: rec.abordo,
    recibido: rec.recibido,
    peajes: rec.peajes,
    gasolina: rec.gasolina,
    gastos: rec.gastos || rec.gasolina,
    obs: rec.obs,
    updated_at: rec.updatedAt,
    updated_by: rec.updatedBy,
  });
  if (error) {
    console.error("Error guardando registro en Supabase:", error);
    return false;
  }
  return true;
}

export async function saveDriverToSupabase(driver: Driver): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("drivers").upsert({
    id: driver.id,
    nombre: driver.nombre,
    usuario: driver.usuario,
    email: driver.email,
    placa: driver.placa,
    activo: driver.activo,
    creado: driver.creado,
    password: driver.password,
  });
  if (error) {
    console.error("Error guardando conductor en Supabase:", error);
    return false;
  }
  return true;
}

export async function saveAdminUserToSupabase(admin: AdminUser): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("admin_users").upsert({
    id: admin.id,
    nombre: admin.nombre,
    usuario: admin.usuario,
    email: admin.email,
    activo: admin.activo,
    creado: admin.creado,
    password: admin.password,
  });
  if (error) {
    console.error("Error guardando administrador en Supabase:", error);
    return false;
  }
  return true;
}

export async function saveCashTransactionToSupabase(tx: CashTransaction): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("cash_transactions").upsert({
    id: tx.id,
    driver_id: tx.driverId,
    period_id: tx.period_id || null,
    tipo: tx.tipo,
    monto: tx.monto,
    estado: tx.estado,
    fecha: tx.fecha,
    obs: tx.obs,
    created_at: tx.createdAt,
  });
  if (error) {
    console.error("Error guardando transacción de caja en Supabase:", error);
    return false;
  }
  return true;
}

export async function deleteTransactionsForDriverFromSupabase(driverId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("cash_transactions").delete().eq("driver_id", driverId);
  if (error) {
    console.error("Error limpiando transacciones del conductor:", error);
    return false;
  }
  return true;
}

export async function deleteDriverFromSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("drivers").delete().eq("id", id);
  if (error) {
    console.error("Error eliminando conductor en Supabase:", error);
    return false;
  }
  return true;
}

export async function deleteAdminUserFromSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("admin_users").delete().eq("id", id);
  if (error) {
    console.error("Error eliminando administrador en Supabase:", error);
    return false;
  }
  return true;
}

export async function saveAuditEntryToSupabase(audit: AuditEntry): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("audit_log").insert({
    id: audit.id,
    at: audit.at,
    by_name: audit.by,
    driver_id: audit.driverId,
    fecha: audit.fecha,
    accion: audit.accion,
  });
  if (error) {
    console.error("Error guardando registro de auditoría en Supabase:", error);
    return false;
  }
  return true;
}
