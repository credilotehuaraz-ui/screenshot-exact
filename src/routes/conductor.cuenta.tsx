import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, LogOut, Moon, Sun, Monitor, CloudOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, Section } from "@/components/app/primitives";
import { useApp, useCurrentDriver, type ThemePref } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/conductor/cuenta")({
  component: Cuenta,
});

export function ThemePicker() {
  const { theme, setTheme } = useApp();
  const opts: { v: ThemePref; l: string; i: typeof Sun }[] = [
    { v: "light", l: "Claro", i: Sun },
    { v: "dark", l: "Oscuro", i: Moon },
    { v: "system", l: "Sistema", i: Monitor },
  ];
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
      {opts.map((o) => (
        <button key={o.v} onClick={() => setTheme(o.v)} className={cn("flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold", theme === o.v ? "bg-background shadow-card" : "text-muted-foreground")}>
          <o.i className="size-3.5" /> {o.l}
        </button>
      ))}
    </div>
  );
}

function Cuenta() {
  const driver = useCurrentDriver();
  const { logout, changePassword } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [err, setErr] = useState("");
  if (!driver) return null;

  const rows: [string, string][] = [
    ["Nombre", driver.nombre],
    ["Usuario", driver.usuario],
    ["Placa asignada", driver.placa],
    ["Estado de cuenta", driver.activo ? "Activa" : "Desactivada"],
  ];

  return (
    <div>
      <PageHeader title="Mi cuenta" />
      <div className="space-y-3 p-4">
        <Section>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-lg font-bold text-primary">
              {driver.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </div>
            <div>
              <p className="font-semibold">{driver.nombre}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="size-3" /> Conductor
              </p>
            </div>
          </div>
          <dl className="divide-y">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>
        <Section title="Apariencia">
          <ThemePicker />
        </Section>
        <Section title="Sincronización">
          <p className="flex items-center gap-2 text-sm">
            <CloudOff className="size-4 text-muted-foreground" /> Sin sincronización: este prototipo guarda los datos solo en este dispositivo.
          </p>
        </Section>
        <Button variant="outline" size="xl" className="w-full" onClick={() => setOpen(true)}>
          <KeyRound /> Cambiar contraseña
        </Button>
        <Button
          variant="ghost"
          size="xl"
          className="w-full text-negative"
          onClick={() => {
            logout();
            navigate({ to: "/" });
          }}
        >
          <LogOut /> Cerrar sesión
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cur">Contraseña actual</Label>
              <Input id="cur" type="password" value={cur} onChange={(e) => setCur(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nw">Nueva contraseña</Label>
              <Input id="nw" type="password" value={nw} onChange={(e) => setNw(e.target.value)} />
            </div>
            {err && <p className="text-sm text-negative">{err}</p>}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (nw.length < 4) return setErr("Mínimo 4 caracteres.");
                const r = changePassword(cur, nw);
                if (!r.ok) return setErr(r.error!);
                setOpen(false);
                setCur("");
                setNw("");
                setErr("");
                toast.success("Contraseña actualizada");
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
