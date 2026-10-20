import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, CloudOff, Loader2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/money";
import { formatWeekRange, addDays, weekStart, todayLima } from "@/lib/dates";
import type { DayState } from "@/lib/finance";

export function MobileShell({ children, nav }: { children: ReactNode; nav?: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted">
      <div className={cn("relative mx-auto min-h-screen max-w-[430px] bg-background", nav && "pb-24")}>
        {children}
        {nav}
      </div>
    </div>
  );
}

export interface NavItem {
  to: LinkProps["to"];
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[430px] border-t bg-background/95 shadow-float backdrop-blur">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((it) => (
          <li key={it.label}>
            <Link
              to={it.to}
              activeOptions={{ exact: it.exact }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <it.icon className="size-5" />
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PageHeader({ title, subtitle, back, right }: { title: string; subtitle?: string; back?: LinkProps["to"]; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur">
      {back && (
        <Link to={back} className="-ml-1 rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Volver">
          <ChevronLeft className="size-5" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function Section({ title, children, action, className }: { title?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={cn("surface p-4", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export type Tone = "default" | "positive" | "negative" | "primary" | "muted" | "warning";
export const toneText: Record<Tone, string> = {
  default: "text-foreground",
  positive: "text-positive",
  negative: "text-negative",
  primary: "text-primary",
  muted: "text-muted-foreground",
  warning: "text-warning",
};
export const cashTone = (c: number): Tone => (c < 0 ? "negative" : c > 0 ? "positive" : "default");

export function StatCard({ label, value, tone = "default", hint, icon: Icon, className }: { label: string; value: string; tone?: Tone; hint?: string; icon?: LucideIcon; className?: string }) {
  return (
    <div className={cn("surface p-3.5", className)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </div>
      <div className={cn("num mt-1.5 text-xl font-semibold", toneText[tone])}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** One line of a vertical operation: [sign] label ........ amount */
export function OpLine({ op, label, value, tone = "default", total, big }: { op?: string; label?: string; value: string; tone?: Tone; total?: boolean; big?: boolean }) {
  return (
    <div className={cn("grid grid-cols-[1.25rem_1fr_auto] items-baseline gap-2 py-1", total && "mt-1 border-t border-dashed pt-2")}>
      <span className="num text-center text-sm font-semibold text-muted-foreground">{op}</span>
      <span className={cn("text-sm", total ? "font-semibold" : "text-muted-foreground")}>{label}</span>
      <span className={cn("num text-right", big ? "text-lg font-bold" : total ? "text-base font-semibold" : "text-sm", toneText[tone])}>{value}</span>
    </div>
  );
}

export function Money({ c, tone, className }: { c: number; tone?: Tone; className?: string }) {
  return <span className={cn("num", tone && toneText[tone], className)}>{fmt(c)}</span>;
}

const stateMeta: Record<DayState, { label: string; cls: string }> = {
  trabajado: { label: "Trabajado", cls: "bg-positive-soft text-positive" },
  no_trabajado: { label: "No trabajado", cls: "bg-muted text-muted-foreground" },
  pendiente: { label: "Pendiente", cls: "bg-warning-soft text-warning" },
  sin_datos: { label: "Sin datos", cls: "border border-dashed border-negative/50 text-negative" },
  futuro: { label: "Por venir", cls: "text-muted-foreground" },
};
export const stateLabel = (s: DayState) => stateMeta[s].label;

export function StatusBadge({ estado }: { estado: DayState }) {
  const m = stateMeta[estado];
  return <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", m.cls)}>{m.label}</span>;
}

export function WeekSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const current = weekStart(todayLima());
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border bg-background p-1">
      <button onClick={() => onChange(addDays(value, -7))} className="rounded-lg p-2 hover:bg-muted" aria-label="Semana anterior">
        <ChevronLeft className="size-4" />
      </button>
      <div className="text-center">
        <div className="text-sm font-semibold">{formatWeekRange(value)}</div>
        <button onClick={() => onChange(current)} className={cn("text-[11px]", value === current ? "text-primary" : "text-muted-foreground underline")}>
          {value === current ? "Semana actual" : "Ir a semana actual"}
        </button>
      </div>
      <button
        onClick={() => onChange(addDays(value, 7))}
        disabled={value >= current}
        className="rounded-lg p-2 hover:bg-muted disabled:opacity-30"
        aria-label="Semana siguiente"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

export function SyncIndicator({ compact }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground" title="Prototipo: los datos se guardan solo en este dispositivo">
      <CloudOff className="size-3" />
      {!compact && "Solo local · demo"}
    </span>
  );
}

export function DemoBanner() {
  return <div className="bg-primary-soft px-4 py-1.5 text-center text-[11px] font-medium text-accent-foreground">Prototipo · datos de demostración guardados en este dispositivo</div>;
}

export function FullLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center">
      <div className="mb-3 rounded-full bg-muted p-3">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground">CC</div>
      <div className="leading-none">
        <div className="text-base font-extrabold tracking-tight">
          Control <span className="text-primary">Cabify</span>
        </div>
      </div>
    </div>
  );
}
