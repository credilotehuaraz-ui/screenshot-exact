import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DailyRecord } from "./finance";
import { demoAudit, demoDrivers, demoRecords, type AuditEntry, type Driver, type AdminUser, type CashTransaction } from "./demo-data";
import {
  isSupabaseConfigured,
  fetchDriversFromSupabase,
  fetchAdminUsersFromSupabase,
  fetchRecordsFromSupabase,
  fetchAuditFromSupabase,
  fetchCashTransactionsFromSupabase,
  saveRecordToSupabase,
  saveDriverToSupabase,
  saveAdminUserToSupabase,
  saveAuditEntryToSupabase,
  saveCashTransactionToSupabase,
  deleteDriverFromSupabase,
  deleteAdminUserFromSupabase,
  signInWithSupabaseAuth,
  signOutFromSupabaseAuth,
  updateSupabasePassword,
} from "./supabase";

export type { Driver, AdminUser, AuditEntry, CashTransaction };
export type Role = "superadmin" | "admin" | "conductor";
export type ThemePref = "light" | "dark" | "system";

export interface Session {
  role: Role;
  driverId?: string;
  nombre: string;
}

interface PersistedState {
  drivers: Driver[];
  admins: AdminUser[];
  records: DailyRecord[];
  audit: AuditEntry[];
  cashTransactions: CashTransaction[];
  session: Session | null;
  theme: ThemePref;
  lastSaved: string | null;
}

const KEY = "control-cabify-store-v7";
const SUPERADMIN = { usuario: "superadmin", password: "superadmin123" };
const DEFAULT_ADMIN = { usuario: "admin", password: "admin123" };

const initial = (): PersistedState => ({
  drivers: demoDrivers,
  admins: [],
  records: demoRecords,
  audit: demoAudit,
  cashTransactions: [],
  session: null,
  theme: "light",
  lastSaved: null,
});

const uid = () => Math.random().toString(36).slice(2, 10);

interface AppCtx extends PersistedState {
  hydrated: boolean;
  login: (usuario: string, password: string) => Promise<{ ok: true; role: Role } | { ok: false; error: string }>;
  logout: () => void;
  upsertRecord: (rec: Omit<DailyRecord, "id" | "updatedAt" | "updatedBy"> & { id?: string }) => DailyRecord;
  saveDriver: (d: Omit<Driver, "id" | "creado" | "password"> & { id?: string; password?: string }) => { ok: boolean; error?: string };
  deleteDriver: (id: string) => void;
  setDriverActive: (id: string, activo: boolean) => void;
  saveAdminUser: (a: Omit<AdminUser, "id" | "creado" | "password"> & { id?: string; password?: string }) => { ok: boolean; error?: string };
  deleteAdminUser: (id: string) => void;
  setAdminUserActive: (id: string, activo: boolean) => void;
  requestCashReturn: (driverId: string, monto: number, obs?: string, periodId?: string) => void;
  requestCompanyRefund: (driverId: string, monto: number, obs?: string, periodId?: string) => void;
  requestDriverRefund: (driverId: string, monto: number, obs?: string, periodId?: string) => void;
  sendRefundReminder: (driverId: string, monto: number, obs?: string, periodId?: string) => void;
  updateCashTransactionStatus: (id: string, estado: "pendiente" | "comprobante_enviado" | "en_revision" | "aprobado" | "confirmado" | "rechazado" | "no_encontrado") => void;
  changePassword: (current: string, next: string) => { ok: boolean; error?: string };
  setTheme: (t: ThemePref) => void;
  resetDemo: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setState((s) => ({ ...s, ...parsed }));
        }

        if (isSupabaseConfigured()) {
          const [dbDrivers, dbAdmins, dbRecords, dbAudit, dbCash] = await Promise.all([
            fetchDriversFromSupabase(),
            fetchAdminUsersFromSupabase(),
            fetchRecordsFromSupabase(),
            fetchAuditFromSupabase(),
            fetchCashTransactionsFromSupabase(),
          ]);
          setState((s) => ({
            ...s,
            drivers: dbDrivers,
            admins: dbAdmins,
            records: dbRecords,
            audit: dbAudit,
            cashTransactions: dbCash,
          }));
        }
      } catch (e) {
        console.warn("Error hidratando estado:", e);
      } finally {
        setHydrated(true);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, hydrated]);

  useEffect(() => {
    const apply = () => {
      const dark = state.theme === "dark" || (state.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [state.theme]);

  const login: AppCtx["login"] = useCallback(
    async (usuario, password) => {
      await new Promise((r) => setTimeout(r, 200));
      const u = usuario.trim().toLowerCase();

      // 1. Intentar inicio de sesión real vía Supabase Auth si el usuario ingresó un email
      if (isSupabaseConfigured() && u.includes("@")) {
        const authRes = await signInWithSupabaseAuth(u, password);
        if (!authRes.error && authRes.data.user) {
          const email = authRes.data.user.email?.toLowerCase();
          const d = state.drivers.find((x) => x.email.toLowerCase() === email);
          if (d) {
            if (!d.activo) return { ok: false, error: "Tu cuenta está desactivada." };
            setState((s) => ({ ...s, session: { role: "conductor", driverId: d.id, nombre: d.nombre } }));
            return { ok: true, role: "conductor" };
          }
          const adm = state.admins.find((x) => x.email.toLowerCase() === email);
          if (adm) {
            if (!adm.activo) return { ok: false, error: "Tu cuenta de administrador está desactivada." };
            setState((s) => ({ ...s, session: { role: "admin", nombre: adm.nombre } }));
            return { ok: true, role: "admin" };
          }
        }
      }

      // 2. Validar Superadmin
      if (u === SUPERADMIN.usuario && password === SUPERADMIN.password) {
        setState((s) => ({ ...s, session: { role: "superadmin", nombre: "Super Administrador" } }));
        return { ok: true, role: "superadmin" };
      }

      // 3. Validar Admin por defecto / lista de admins
      if (u === DEFAULT_ADMIN.usuario && password === DEFAULT_ADMIN.password) {
        setState((s) => ({ ...s, session: { role: "admin", nombre: "Administrador Principal" } }));
        return { ok: true, role: "admin" };
      }

      const adm = state.admins.find((x) => x.usuario === u || x.email.toLowerCase() === u);
      if (adm && adm.password === password) {
        if (!adm.activo) return { ok: false, error: "Tu cuenta de administrador está desactivada." };
        setState((s) => ({ ...s, session: { role: "admin", nombre: adm.nombre } }));
        return { ok: true, role: "admin" };
      }

      // 4. Validar Conductor
      const d = state.drivers.find((x) => x.usuario === u || x.email.toLowerCase() === u);
      if (!d || d.password !== password) return { ok: false, error: "Usuario o contraseña incorrectos." };
      if (!d.activo) return { ok: false, error: "Tu cuenta está desactivada. Contacta al administrador." };
      setState((s) => ({ ...s, session: { role: "conductor", driverId: d.id, nombre: d.nombre } }));
      return { ok: true, role: "conductor" };
    },
    [state.drivers, state.admins],
  );

  const value: AppCtx = useMemo(
    () => ({
      ...state,
      hydrated,
      login,
      logout: () => {
        signOutFromSupabaseAuth();
        setState((s) => ({ ...s, session: null }));
      },
      upsertRecord: (rec) => {
        const by = state.session?.nombre ?? "Sistema";
        const existing = state.records.find((x) => x.id === rec.id || (x.driverId === rec.driverId && x.fecha === rec.fecha));
        const saved: DailyRecord = { ...rec, id: existing?.id ?? `rec-${uid()}`, updatedAt: new Date().toISOString(), updatedBy: by };
        const accion = existing ? "Corrigió registro" : "Creó registro";
        const newAuditEntry: AuditEntry = { id: uid(), at: saved.updatedAt, by, driverId: rec.driverId, fecha: rec.fecha, accion };

        setState((s) => ({
          ...s,
          records: existing ? s.records.map((x) => (x.id === existing.id ? saved : x)) : [...s.records, saved],
          audit: [newAuditEntry, ...s.audit],
          lastSaved: saved.updatedAt,
        }));

        if (isSupabaseConfigured()) {
          saveRecordToSupabase(saved);
          saveAuditEntryToSupabase(newAuditEntry);
        }

        return saved;
      },
      saveDriver: (d) => {
        const usuario = d.usuario.trim().toLowerCase();
        if (state.drivers.some((x) => x.usuario === usuario && x.id !== d.id)) return { ok: false, error: "Ese usuario ya existe en conductores." };

        let savedDriver: Driver | null = null;
        setState((s) => {
          if (d.id) {
            const updated = s.drivers.map((x) => (x.id === d.id ? { ...x, ...d, usuario, password: d.password || x.password } : x));
            savedDriver = updated.find((x) => x.id === d.id) ?? null;
            return { ...s, drivers: updated };
          }
          const nd: Driver = { ...d, usuario, id: `d-${uid()}`, creado: new Date().toISOString().slice(0, 10), password: d.password || "1234" };
          savedDriver = nd;
          return { ...s, drivers: [...s.drivers, nd] };
        });

        if (savedDriver && isSupabaseConfigured()) {
          saveDriverToSupabase(savedDriver);
        }

        return { ok: true };
      },
      deleteDriver: (id) => {
        setState((s) => ({
          ...s,
          drivers: s.drivers.filter((x) => x.id !== id),
          records: s.records.filter((r) => r.driverId !== id),
          audit: s.audit.filter((a) => a.driverId !== id),
          cashTransactions: s.cashTransactions.filter((t) => t.driverId !== id),
        }));

        if (isSupabaseConfigured()) {
          deleteDriverFromSupabase(id);
        }
      },
      setDriverActive: (id, activo) => {
        let updatedDriver: Driver | null = null;
        setState((s) => {
          const drivers = s.drivers.map((x) => {
            if (x.id === id) {
              updatedDriver = { ...x, activo };
              return updatedDriver;
            }
            return x;
          });
          return { ...s, drivers };
        });

        if (updatedDriver && isSupabaseConfigured()) {
          saveDriverToSupabase(updatedDriver);
        }
      },
      saveAdminUser: (a) => {
        const usuario = a.usuario.trim().toLowerCase();
        if (state.admins.some((x) => x.usuario === usuario && x.id !== a.id)) return { ok: false, error: "Ese usuario ya existe en administradores." };

        let savedAdmin: AdminUser | null = null;
        setState((s) => {
          if (a.id) {
            const updated = s.admins.map((x) => (x.id === a.id ? { ...x, ...a, usuario, password: a.password || x.password } : x));
            savedAdmin = updated.find((x) => x.id === a.id) ?? null;
            return { ...s, admins: updated };
          }
          const na: AdminUser = { ...a, usuario, id: `adm-${uid()}`, creado: new Date().toISOString().slice(0, 10), password: a.password || "admin123" };
          savedAdmin = na;
          return { ...s, admins: [...s.admins, na] };
        });

        if (savedAdmin && isSupabaseConfigured()) {
          saveAdminUserToSupabase(savedAdmin);
        }

        return { ok: true };
      },
      deleteAdminUser: (id) => {
        setState((s) => ({
          ...s,
          admins: s.admins.filter((x) => x.id !== id),
        }));

        if (isSupabaseConfigured()) {
          deleteAdminUserFromSupabase(id);
        }
      },
      setAdminUserActive: (id, activo) => {
        let updatedAdmin: AdminUser | null = null;
        setState((s) => {
          const admins = s.admins.map((x) => {
            if (x.id === id) {
              updatedAdmin = { ...x, activo };
              return updatedAdmin;
            }
            return x;
          });
          return { ...s, admins };
        });

        if (updatedAdmin && isSupabaseConfigured()) {
          saveAdminUserToSupabase(updatedAdmin);
        }
      },
      requestCashReturn: (driverId, monto, obs = "", periodId?: string) => {
        const tx: CashTransaction = {
          id: `tx-${uid()}`,
          driverId,
          period_id: periodId,
          tipo: "devolucion_conductor",
          monto,
          estado: "comprobante_enviado",
          fecha: new Date().toISOString().slice(0, 10),
          obs,
          createdAt: new Date().toISOString(),
        };

        setState((s) => ({
          ...s,
          cashTransactions: [tx, ...s.cashTransactions],
        }));

        if (isSupabaseConfigured()) {
          saveCashTransactionToSupabase(tx);
        }
      },
      requestCompanyRefund: (driverId, monto, obs = "", periodId?: string) => {
        const tx: CashTransaction = {
          id: `tx-${uid()}`,
          driverId,
          period_id: periodId,
          tipo: "reembolso_empresa",
          monto,
          estado: "pendiente",
          fecha: new Date().toISOString().slice(0, 10),
          obs,
          createdAt: new Date().toISOString(),
        };

        setState((s) => ({
          ...s,
          cashTransactions: [tx, ...s.cashTransactions],
        }));

        if (isSupabaseConfigured()) {
          saveCashTransactionToSupabase(tx);
        }
      },
      requestDriverRefund: (driverId, monto, obs = "", periodId?: string) => {
        const tx: CashTransaction = {
          id: `tx-${uid()}`,
          driverId,
          period_id: periodId,
          tipo: "solicitud_conductor",
          monto,
          estado: "pendiente",
          fecha: new Date().toISOString().slice(0, 10),
          obs,
          createdAt: new Date().toISOString(),
        };

        setState((s) => ({
          ...s,
          cashTransactions: [tx, ...s.cashTransactions],
        }));

        if (isSupabaseConfigured()) {
          saveCashTransactionToSupabase(tx);
        }
      },
      sendRefundReminder: (driverId, monto, obs = "", periodId?: string) => {
        const tx: CashTransaction = {
          id: `tx-${uid()}`,
          driverId,
          period_id: periodId,
          tipo: "recordatorio_empresa",
          monto,
          estado: "pendiente",
          fecha: new Date().toISOString().slice(0, 10),
          obs,
          createdAt: new Date().toISOString(),
        };

        setState((s) => ({
          ...s,
          cashTransactions: [tx, ...s.cashTransactions],
        }));

        if (isSupabaseConfigured()) {
          saveCashTransactionToSupabase(tx);
        }
      },
      updateCashTransactionStatus: (id, estado) => {
        let updatedTx: CashTransaction | null = null;
        setState((s) => {
          const cashTransactions = s.cashTransactions.map((t) => {
            if (t.id === id) {
              updatedTx = { ...t, estado };
              return updatedTx;
            }
            return t;
          });
          return { ...s, cashTransactions };
        });

        if (updatedTx && isSupabaseConfigured()) {
          saveCashTransactionToSupabase(updatedTx);
        }
      },
      changePassword: (current, next) => {
        const d = state.drivers.find((x) => x.id === state.session?.driverId);
        if (!d) return { ok: false, error: "Sesión no válida." };
        if (d.password !== current) return { ok: false, error: "La contraseña actual no es correcta." };

        const updatedDriver = { ...d, password: next };
        setState((s) => ({ ...s, drivers: s.drivers.map((x) => (x.id === d.id ? updatedDriver : x)) }));

        if (isSupabaseConfigured()) {
          saveDriverToSupabase(updatedDriver);
          updateSupabasePassword(next);
        }

        return { ok: true };
      },
      setTheme: (theme) => setState((s) => ({ ...s, theme })),
      resetDemo: () => setState({ ...initial(), session: state.session, theme: state.theme }),
    }),
    [state, hydrated, login],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp must be used inside AppProvider");
  return c;
}

export function useCurrentDriver() {
  const { drivers, session } = useApp();
  return drivers.find((d) => d.id === session?.driverId) ?? null;
}

export function useDriverRecords(driverId: string | undefined) {
  const { records } = useApp();
  return useMemo(() => records.filter((r) => r.driverId === driverId), [records, driverId]);
}
