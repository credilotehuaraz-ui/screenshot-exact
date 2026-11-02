import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Lock, Receipt, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  cajaAnteriorFor,
  cajaStep,
  getRecordExpenses,
  expenseCategoryMeta,
  type DailyRecord,
  type DayStatus,
  type ExpenseCategory,
  type ExpenseItem,
} from "@/lib/finance";
import { fmt, parseMoney, toInput } from "@/lib/money";
import { formatLong, weekDays, weekStart } from "@/lib/dates";
import { useApp, type Driver } from "@/lib/store";
import { OpLine, Section, cashTone } from "./primitives";
import { cn } from "@/lib/utils";

interface ExpenseRow {
  id: string;
  categoria: ExpenseCategory;
  monto: string;
  desc: string;
}

interface FormState {
  fecha: string;
  estado: DayStatus;
  produccion: string;
  abordo: string;
  recibido: string;
  gastos: ExpenseRow[];
  peajes: string;
  obs: string;
}

const rid = () => Math.random().toString(36).slice(2, 9);

function fromRecord(fecha: string, r?: DailyRecord): FormState {
  const existingExpenses = getRecordExpenses(r || { gasolina: [] });
  return {
    fecha,
    estado: r?.estado ?? "trabajado",
    produccion: r ? toInput(r.produccion) : "",
    abordo: r ? toInput(r.abordo) : "",
    recibido: r ? toInput(r.recibido) : "",
    gastos: existingExpenses.length
      ? existingExpenses.map((g) => ({ id: g.id, categoria: g.categoria, monto: toInput(g.monto), desc: g.desc ?? "" }))
      : [{ id: rid(), categoria: "gasolina", monto: "", desc: "" }],
    peajes: r ? toInput(r.peajes) : "",
    obs: r?.obs ?? "",
  };
}

function MoneyField({ id, label, value, onChange, error, hint, placeholder = "0.00" }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: boolean; hint?: string; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">S/</span>
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn("num h-12 pl-9 text-lg", error && "border-negative focus-visible:ring-negative")}
        />
      </div>
      {error ? <p className="text-xs text-negative">Importe no válido (sin negativos, máx. 2 decimales).</p> : hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const estados: { v: DayStatus; label: string }[] = [
  { v: "trabajado", label: "Trabajado" },
  { v: "no_trabajado", label: "No trabajado" },
  { v: "pendiente", label: "Pendiente" },
];

export function RecordForm({ driver, initialFecha, onSaved, onCancel, onViewCuadre }: { driver: Driver; initialFecha: string; onSaved: (r: DailyRecord) => void; onCancel: () => void; onViewCuadre: (fecha: string) => void }) {
  const { records, upsertRecord } = useApp();
  const driverRecords = useMemo(() => records.filter((r) => r.driverId === driver.id), [records, driver.id]);
  const findRec = (f: string) => driverRecords.find((r) => r.fecha === f);

  const [form, setForm] = useState<FormState>(() => fromRecord(initialFecha, findRec(initialFecha)));
  const [editingId, setEditingId] = useState<string | undefined>(() => findRec(initialFecha)?.id);
  const [dirty, setDirty] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState<null | (() => void)>(null);

  useEffect(() => {
    const r = findRec(initialFecha);
    setForm(fromRecord(initialFecha, r));
    setEditingId(r?.id);
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFecha]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const conflict = form.fecha ? findRec(form.fecha) : undefined;
  const isConflict = conflict && conflict.id !== editingId;
  const off = form.estado === "no_trabajado";

  const parsed = {
    produccion: off ? 0 : parseMoney(form.produccion),
    abordo: off ? 0 : parseMoney(form.abordo),
    recibido: parseMoney(form.recibido),
    peajes: off ? 0 : parseMoney(form.peajes),
    gastos: off ? [] : form.gastos.map((g) => ({ ...g, cents: parseMoney(g.monto) })),
  };
  const expValid = parsed.gastos.every((g) => g.cents !== null);
  const expSum = parsed.gastos.reduce((s, g) => s + (g.cents ?? 0), 0);
  const valid = !!form.fecha && !isConflict && parsed.produccion !== null && parsed.abordo !== null && parsed.recibido !== null && parsed.peajes !== null && expValid;

  const weekRecs = form.fecha ? driverRecords.filter((r) => weekDays(weekStart(form.fecha)).includes(r.fecha)) : [];
  const anterior = form.fecha ? cajaAnteriorFor(weekRecs, form.fecha) : 0;
  const preview = cajaStep(anterior, {
    fecha: form.fecha,
    abordo: parsed.abordo ?? 0,
    recibido: parsed.recibido ?? 0,
    peajes: parsed.peajes ?? 0,
    gasolina: [{ id: "x", monto: expSum }],
  });

  const guard = (fn: () => void) => (dirty ? setConfirmLeave(() => fn) : fn());

  const save = () => {
    setSubmitted(true);
    if (!valid) return;

    const formattedExpenses: ExpenseItem[] = parsed.gastos
      .filter((g) => (g.cents ?? 0) > 0)
      .map((g) => ({ id: g.id, categoria: g.categoria, monto: g.cents!, desc: g.desc.trim() }));

    const saved = upsertRecord({
      id: editingId,
      driverId: driver.id,
      fecha: form.fecha,
      estado: form.estado,
      produccion: parsed.produccion!,
      abordo: parsed.abordo!,
      recibido: parsed.recibido!,
      peajes: parsed.peajes!,
      gasolina: formattedExpenses.map((g) => ({ id: g.id, monto: g.monto, desc: `${expenseCategoryMeta[g.categoria].icon} ${g.categoria}: ${g.desc}`.trim() })),
      gastos: formattedExpenses,
      obs: form.obs.trim(),
    });
    setDirty(false);
    onSaved(saved);
  };

  return (
    <div className="space-y-3 p-4">
      {editingId && (
        <div className="flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2 text-sm text-accent-foreground">
          <Info className="size-4" /> Editando registro existente. Los saldos posteriores de la semana se recalcularán.
        </div>
      )}

      <Section title="Datos generales">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fecha">Fecha</Label>
            <Input id="fecha" type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} className={cn("h-12", submitted && !form.fecha && "border-negative")} />
            {submitted && !form.fecha && <p className="text-xs text-negative">La fecha es obligatoria.</p>}
            {isConflict && (
              <div className="rounded-lg bg-warning-soft p-3 text-sm">
                <p className="font-medium text-warning">Ya existe un registro para el {formatLong(form.fecha)}.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    setForm(fromRecord(form.fecha, conflict));
                    setEditingId(conflict!.id);
                    setDirty(false);
                  }}
                >
                  Editar el registro existente
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Estado del día</Label>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
              {estados.map((e) => (
                <button
                  key={e.v}
                  type="button"
                  onClick={() => set("estado", e.v)}
                  className={cn("rounded-lg px-2 py-2 text-xs font-semibold transition-colors", form.estado === e.v ? "bg-background text-foreground shadow-card" : "text-muted-foreground")}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2.5">
            <span className="text-sm text-muted-foreground">Placa del vehículo</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              {driver.placa} <Lock className="size-3.5 text-muted-foreground" />
            </span>
          </div>
        </div>
      </Section>

      {!off && (
        <>
          <Section title="Producción">
            <MoneyField id="prod" label="Producción diaria" placeholder="194.29" value={form.produccion} onChange={(v) => set("produccion", v)} error={parsed.produccion === null} />
          </Section>
          <Section title="Dinero a bordo">
            <MoneyField id="abordo" label="Dinero a bordo" placeholder="60.59" value={form.abordo} onChange={(v) => set("abordo", v)} error={parsed.abordo === null} />
          </Section>
        </>
      )}

      <Section title="Efectivo recibido">
        <MoneyField id="recibido" label="Dinero recibido para caja chica" value={form.recibido} onChange={(v) => set("recibido", v)} error={parsed.recibido === null} hint="Predeterminado S/ 0.00" />
      </Section>

      {!off && (
        <>
          <Section
            title="Gastos Operativos (Gasolina, Lavado, Llanta, etc.)"
            action={
              <span className="num text-sm font-bold text-foreground">
                <Receipt className="mr-1 inline size-3.5 text-primary" />
                {fmt(expSum)}
              </span>
            }
          >
            <div className="space-y-3">
              {form.gastos.map((g, i) => (
                <div key={g.id} className="space-y-2 rounded-xl border bg-card p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-muted-foreground">Gasto #{i + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-negative hover:bg-negative-soft hover:text-negative"
                      onClick={() => set("gastos", form.gastos.filter((x) => x.id !== g.id))}
                    >
                      <Trash2 className="size-3.5 mr-1" /> Borrar
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Categoría</Label>
                      <select
                        value={g.categoria}
                        onChange={(e) =>
                          set(
                            "gastos",
                            form.gastos.map((x) => (x.id === g.id ? { ...x, categoria: e.target.value as ExpenseCategory } : x)),
                          )
                        }
                        className="h-10 w-full rounded-lg border bg-background px-2.5 text-xs font-semibold"
                      >
                        {Object.entries(expenseCategoryMeta).map(([catKey, meta]) => (
                          <option key={catKey} value={catKey}>
                            {meta.icon} {meta.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Monto S/</Label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S/</span>
                        <Input
                          inputMode="decimal"
                          placeholder="0.00"
                          value={g.monto}
                          onChange={(e) =>
                            set(
                              "gastos",
                              form.gastos.map((x) => (x.id === g.id ? { ...x, monto: e.target.value } : x)),
                            )
                          }
                          className={cn("num h-10 pl-7 text-sm font-semibold", parseMoney(g.monto) === null && "border-negative")}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Descripción detallada</Label>
                    <Input
                      placeholder={
                        g.categoria === "gasolina"
                          ? "Ej: Grifo Primo / 90 octanos"
                          : g.categoria === "lavado"
                            ? "Ej: Lavado salón y carrocería"
                            : g.categoria === "llanta"
                              ? "Ej: Parche pinchazo llanta delantera"
                              : "Detalle del gasto"
                      }
                      value={g.desc}
                      onChange={(e) =>
                        set(
                          "gastos",
                          form.gastos.map((x) => (x.id === g.id ? { ...x, desc: e.target.value } : x)),
                        )
                      }
                      className="h-10 text-xs"
                    />
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                className="h-11 w-full border-dashed font-semibold"
                onClick={() => set("gastos", [...form.gastos, { id: rid(), categoria: "gasolina", monto: "", desc: "" }])}
              >
                <Plus className="mr-1" /> Añadir otro gasto
              </Button>
            </div>
          </Section>

          <Section title="Peajes">
            <MoneyField id="peajes" label="Total de peajes" value={form.peajes} onChange={(v) => set("peajes", v)} error={parsed.peajes === null} hint="Predeterminado S/ 0.00 (Reembolsable por Cabify)" />
          </Section>
        </>
      )}

      <Section title="Observaciones">
        <Textarea placeholder="Opcional" value={form.obs} onChange={(e) => set("obs", e.target.value)} />
      </Section>

      <Section title="Caja chica estimada">
        <OpLine label="Caja anterior" value={fmt(preview.cajaAnterior)} />
        <OpLine op="+" label="A bordo + recibido" value={fmt(preview.abordo + preview.recibido)} />
        <OpLine op="−" label="Gastos Operativos + Peajes" value={fmt(preview.gasolina + preview.peajes)} />
        <OpLine op="=" label="Caja final" value={fmt(preview.cajaFinal)} tone={cashTone(preview.cajaFinal)} total big />
      </Section>

      <div className="space-y-2 pt-1">
        <Button size="xl" className="w-full" onClick={save} disabled={submitted && !valid}>
          Guardar registro
        </Button>
        {submitted && !valid && <p className="text-center text-xs text-negative font-medium">Revisa los campos marcados.</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" disabled={!editingId} onClick={() => guard(() => onViewCuadre(form.fecha))}>
            Ver cuadre
          </Button>
          <Button variant="ghost" size="lg" onClick={() => guard(onCancel)}>
            Cancelar
          </Button>
        </div>
      </div>

      <AlertDialog open={!!confirmLeave} onOpenChange={(o) => !o && setConfirmLeave(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
            <AlertDialogDescription>Los datos que no guardaste se perderán.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                const fn = confirmLeave;
                setConfirmLeave(null);
                setDirty(false);
                fn?.();
              }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
