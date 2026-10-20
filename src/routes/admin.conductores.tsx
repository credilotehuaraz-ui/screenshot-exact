import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Search, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/app/primitives";
import { useApp, type Driver } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/conductores")({
  component: Conductores,
});

type Draft = { id?: string; nombre: string; usuario: string; email: string; placa: string; activo: boolean; password: string };
const empty: Draft = { nombre: "", usuario: "", email: "", placa: "", activo: true, password: "" };

function Conductores() {
  const { drivers, saveDriver, setDriverActive } = useApp();
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
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
      <PageHeader title="Conductores" subtitle={`${drivers.length} cuentas`} right={<Button size="sm" onClick={() => open()}><Plus /> Crear</Button>} />
      <div className="space-y-3 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o placa" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 pl-9" />
        </div>
        <ul className="space-y-2">
          {list.map((d) => (
            <li key={d.id} className={cn("surface p-3", !d.activo && "opacity-70")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{d.nombre}</p>
                  <p className="text-xs text-muted-foreground">@{d.usuario} · {d.email}</p>
                  <p className="mt-1 text-xs">
                    <span className="rounded border bg-background px-1.5 py-0.5 font-semibold">{d.placa}</span>
                    <span className="ml-2 text-muted-foreground">Alta {d.creado}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[11px] font-semibold", d.activo ? "text-positive" : "text-muted-foreground")}>{d.activo ? "Activo" : "Inactivo"}</span>
                  <Switch checked={d.activo} onCheckedChange={(v) => setDriverActive(d.id, v)} aria-label="Activar o desactivar" />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => open(d)}><Pencil /> Editar</Button>
                <Button asChild size="sm" variant="secondary">
                  <Link to="/admin/conductores/$id" params={{ id: d.id }}>Historial y liquidación <ChevronRight /></Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{draft?.id ? "Editar conductor" : "Crear conductor"}</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              {([["nombre", "Nombre completo"], ["usuario", "Usuario"], ["email", "Correo electrónico"], ["placa", "Placa del vehículo"]] as const).map(([k, l]) => (
                <div key={k} className="space-y-1.5">
                  <Label htmlFor={k}>{l}</Label>
                  <Input id={k} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label htmlFor="pw">{draft.id ? "Nueva contraseña (opcional)" : "Contraseña inicial"}</Label>
                <Input id="pw" type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
                <p className="text-xs text-muted-foreground">Las contraseñas nunca se muestran.</p>
              </div>
              {err && <p className="text-sm text-negative">{err}</p>}
            </div>
          )}
          <DialogFooter><Button onClick={submit}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
