import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { UserCheck, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/app/primitives";
import { RecordForm } from "@/components/app/RecordForm";
import { useApp } from "@/lib/store";
import { todayLima, weekStart } from "@/lib/dates";

export const Route = createFileRoute("/admin/registro")({
  validateSearch: (s: Record<string, unknown>): { driverId?: string; fecha?: string } => ({
    driverId: typeof s.driverId === "string" ? s.driverId : undefined,
    fecha: typeof s.fecha === "string" ? s.fecha : undefined,
  }),
  component: AdminRegistro,
});

function AdminRegistro() {
  const { driverId, fecha } = Route.useSearch();
  const { drivers } = useApp();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string>(driverId ?? "");
  const [q, setQ] = useState("");

  const driver = drivers.find((d) => d.id === selectedId);
  const activeDrivers = drivers.filter((d) => d.activo && `${d.nombre} ${d.placa} ${d.usuario}`.toLowerCase().includes(q.toLowerCase()));

  const back = () => navigate({ to: "/admin/historial" });

  // Paso 1: Selección obligatoria de conductor
  if (!driver) {
    return (
      <div>
        <PageHeader title="Registrar producción diaria" subtitle="Paso 1: Selecciona el conductor" back="/admin/historial" />
        <div className="space-y-4 p-4">
          <div className="rounded-xl border bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Selección requerida</p>
            <p className="mt-0.5">Elige el conductor antes de ingresar los importes para evitar asignaciones erróneas.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, usuario o placa" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 pl-9" />
          </div>

          <div className="space-y-2">
            {activeDrivers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No se encontraron conductores activos con ese criterio.</p>
            ) : (
              activeDrivers.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className="surface flex w-full items-center justify-between p-3.5 text-left transition-colors hover:border-primary"
                >
                  <div>
                    <p className="font-semibold">{d.nombre}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">@{d.usuario}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded border bg-background px-2 py-1 text-xs font-bold tracking-wider">{d.placa}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Paso 2: Formulario de ingreso de datos para el conductor seleccionado
  return (
    <div>
      <PageHeader title="Registrar producción diaria" subtitle={`Cargando datos para ${driver.nombre}`} back="/admin/historial" />

      <div className="mx-4 mt-3 flex items-center justify-between rounded-xl border bg-primary-soft p-3 text-sm">
        <div className="flex items-center gap-2.5">
          <UserCheck className="size-5 shrink-0 text-primary" />
          <div>
            <p className="font-bold text-foreground">{driver.nombre}</p>
            <p className="text-xs text-muted-foreground">Placa del vehículo: <span className="font-semibold text-foreground">{driver.placa}</span></p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSelectedId("")}>
          Cambiar conductor
        </Button>
      </div>

      <RecordForm
        driver={driver}
        initialFecha={fecha ?? todayLima()}
        onCancel={back}
        onViewCuadre={(f) => navigate({ to: "/admin/historial", search: { driverId: driver.id, week: weekStart(f), fecha: f } })}
        onSaved={(savedRecord) => {
          toast.success(`Registro guardado para ${driver.nombre}`, { description: "Redirigiendo a Historial de la flota..." });
          navigate({
            to: "/admin/historial",
            search: { driverId: driver.id, week: weekStart(savedRecord.fecha), fecha: savedRecord.fecha },
          });
        }}
      />
    </div>
  );
}
