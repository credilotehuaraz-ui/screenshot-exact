import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2, Search, ChevronRight, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { EmptyState, PageHeader } from "@/components/app/primitives";
import { useApp, type Driver } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/conductores")({
  component: Conductores,
});

type Draft = { id?: string; nombre: string; usuario: string; email: string; placa: string; activo: boolean; password: string };
const empty: Draft = { nombre: "", usuario: "", email: "", placa: "", activo: true, password: "" };

function Conductores() {
  const { drivers, saveDriver, deleteDriver, setDriverActive } = useApp();
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deletingDriver, setDeletingDriver] = useState<Driver | null>(null);
  const [err, setErr] = useState("");
  const list = drivers.filter((d) => `${d.nombre} ${d.placa} ${d.usuario}`.toLowerCase().includes(q.toLowerCase()));

  const open = (d?: Driver) => {
    setErr("");
    setDraft(d ? { id: d.id, nombre: d.nombre, usuario: d.usuario, email: d.email, placa: d.placa, activo: d.activo, password: "" } : empty);
  };

  const submit = () => {
    if (!draft) return;
    if (!draft.nombre.trim() || !draft.usuario.trim() || !draft.placa.trim()) return setErr("Nombre, usuario y placa son obligatorios.");
    if (!draft.id && draft.password.length < 4) return setErr("Asigna una contraseña inicial (mín. 4).");
    const r = saveDriver({ ...draft, placa: draft.placa.toUpperCase().trim(), nombre: draft.nombre.trim(), email: draft.email.trim() });
    if (!r.ok) return setErr(r.error!);
    toast.success(draft.id ? "Conductor actualizado" : "Conductor creado");
    setDraft(null);
  };

  return (
    <div>
      <PageHeader
        title="Conductores"
        subtitle={`${drivers.length} cuentas registradas`}
        right={
          <Button size="sm" onClick={() => open()}>
            <Plus /> Crear conductor
          </Button>
        }
      />

      <div className="space-y-3 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, usuario o placa" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 pl-9" />
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={UserX}
            title="Sin conductores creados"
            text="Presiona 'Crear conductor' arriba para agregar el primer chofer de la flota."
            action={
              <Button onClick={() => open()}>
                <Plus /> Crear primer conductor
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {list.map((d) => (
              <li key={d.id} className={cn("surface p-3.5", !d.activo && "opacity-70")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-base">{d.nombre}</p>
                    <p className="text-xs text-muted-foreground">@{d.usuario} · {d.email || "sin correo"}</p>
                    <p className="mt-1 text-xs">
                      <span className="rounded border bg-background px-2 py-0.5 font-bold tracking-wider">{d.placa}</span>
                      <span className="ml-2 text-muted-foreground">Alta {d.creado}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[11px] font-semibold", d.activo ? "text-positive" : "text-muted-foreground")}>
                      {d.activo ? "Activo" : "Inactivo"}
                    </span>
                    <Switch checked={d.activo} onCheckedChange={(v) => setDriverActive(d.id, v)} aria-label="Activar o desactivar conductor" />
                  </div>
                </div>

                <div className="mt-3.5 grid grid-cols-3 gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => open(d)} className="text-xs">
                    <Pencil className="size-3.5" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeletingDriver(d)} className="text-xs text-negative hover:bg-negative-soft hover:text-negative">
                    <Trash2 className="size-3.5" /> Eliminar
                  </Button>
                  <Button asChild size="sm" variant="secondary" className="text-xs">
                    <Link to="/admin/historial" search={{ driverId: d.id }}>
                      Historial <ChevronRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dialog para Crear / Editar */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar conductor" : "Crear nuevo conductor"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              {([["nombre", "Nombre completo"], ["usuario", "Usuario de acceso"], ["email", "Correo electrónico"], ["placa", "Placa del vehículo"]] as const).map(([k, l]) => (
                <div key={k} className="space-y-1.5">
                  <Label htmlFor={k}>{l}</Label>
                  <Input id={k} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} placeholder={k === "placa" ? "Ej: BXR-482" : undefined} />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label htmlFor="pw">{draft.id ? "Nueva contraseña (opcional)" : "Contraseña inicial"}</Label>
                <Input id="pw" type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} placeholder="Mínimo 4 caracteres" />
                <p className="text-xs text-muted-foreground">Las contraseñas se almacenan de forma segura.</p>
              </div>
              {err && <p className="text-sm text-negative font-medium">{err}</p>}
            </div>
          )}
          <DialogFooter>
            <Button onClick={submit}>Guardar conductor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmación de Eliminación */}
      <AlertDialog open={!!deletingDriver} onOpenChange={(o) => !o && setDeletingDriver(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar conductor?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará definitivamente la cuenta de <span className="font-semibold text-foreground">{deletingDriver?.nombre}</span> (Placa {deletingDriver?.placa}) y todos sus registros diarios de producción cargados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-negative text-negative-foreground hover:bg-negative/90"
              onClick={() => {
                if (deletingDriver) {
                  deleteDriver(deletingDriver.id);
                  toast.success(`Conductor ${deletingDriver.nombre} eliminado`);
                  setDeletingDriver(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
