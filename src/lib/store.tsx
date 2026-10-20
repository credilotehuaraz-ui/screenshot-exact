import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DailyRecord } from "./finance";
import { demoAudit, demoDrivers, demoRecords, type AuditEntry, type Driver } from "./demo-data";

export type { Driver, AuditEntry };
export type Role = "admin" | "conductor";
export type ThemePref = "light" | "dark" | "system";
export interface Session {
  role: Role;
  driverId?: string;
  nombre: string;
}

interface PersistedState {
  drivers: Driver[];
  records: DailyRecord[];
  audit: AuditEntry[];
  session: Session | null;
  theme: ThemePref;
  lastSaved: string | null;
}

const KEY = "control-cabify-demo-v1";
// DEMO ONLY: simulated admin credentials. Real app authenticates server-side.
const ADMIN = { usuario: "admin", password: "admin123" };

const initial = (): PersistedState => ({
  drivers: demoDrivers,
  records: demoRecords,
  audit: demoAudit,
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
  setDriverActive: (id: string, activo: boolean) => void;
  changePassword: (current: string, next: string) => { ok: boolean; error?: string };
  setTheme: (t: ThemePref) => void;
  resetDemo: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...initial(), ...JSON.parse(raw) });
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
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
      await new Promise((r) => setTimeout(r, 650));
      const u = usuario.trim().toLowerCase();
      if (u === ADMIN.usuario && password === ADMIN.password) {
        setState((s) => ({ ...s, session: { role: "admin", nombre: "Administrador" } }));
        return { ok: true, role: "admin" };
      }
      const d = state.drivers.find((x) => x.usuario === u || x.email.toLowerCase() === u);
      if (!d || d.password !== password) return { ok: false, error: "Usuario o contraseña incorrectos." };
      if (!d.activo) return { ok: false, error: "Tu cuenta está desactivada. Contacta al administrador." };
      setState((s) => ({ ...s, session: { role: "conductor", driverId: d.id, nombre: d.nombre } }));
      return { ok: true, role: "conductor" };
    },
    [state.drivers],
  );

  const value: AppCtx = useMemo(
    () => ({
      ...state,
      hydrated,
      login,
      logout: () => setState((s) => ({ ...s, session: null })),
      upsertRecord: (rec) => {
        const by = state.session?.nombre ?? "Sistema";
        const existing = state.records.find((x) => x.id === rec.id || (x.driverId === rec.driverId && x.fecha === rec.fecha));
        const saved: DailyRecord = { ...rec, id: existing?.id ?? `rec-${uid()}`, updatedAt: new Date().toISOString(), updatedBy: by };
        const accion = existing ? (state.session?.role === "admin" ? "Corrigió registro (admin)" : "Editó registro") : "Creó registro";
        setState((s) => ({
          ...s,
          records: existing ? s.records.map((x) => (x.id === existing.id ? saved : x)) : [...s.records, saved],
          audit: [{ id: uid(), at: saved.updatedAt, by, driverId: rec.driverId, fecha: rec.fecha, accion }, ...s.audit],
          lastSaved: saved.updatedAt,
        }));
        return saved;
      },
      saveDriver: (d) => {
        const usuario = d.usuario.trim().toLowerCase();
        if (state.drivers.some((x) => x.usuario === usuario && x.id !== d.id)) return { ok: false, error: "Ese usuario ya existe." };
        setState((s) => {
          if (d.id) {
            return { ...s, drivers: s.drivers.map((x) => (x.id === d.id ? { ...x, ...d, usuario, password: d.password || x.password } : x)) };
          }
          const nd: Driver = { ...d, usuario, id: `d-${uid()}`, creado: new Date().toISOString().slice(0, 10), password: d.password || "1234" };
          return { ...s, drivers: [...s.drivers, nd] };
        });
        return { ok: true };
      },
      setDriverActive: (id, activo) => setState((s) => ({ ...s, drivers: s.drivers.map((x) => (x.id === id ? { ...x, activo } : x)) })),
      changePassword: (current, next) => {
        const d = state.drivers.find((x) => x.id === state.session?.driverId);
        if (!d) return { ok: false, error: "Sesión no válida." };
        if (d.password !== current) return { ok: false, error: "La contraseña actual no es correcta." };
        setState((s) => ({ ...s, drivers: s.drivers.map((x) => (x.id === d.id ? { ...x, password: next } : x)) }));
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
