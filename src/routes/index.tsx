import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DemoBanner, Logo, MobileShell } from "@/components/app/primitives";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión · Control Cabify" },
      { name: "description", content: "Registra tu producción diaria, tu caja chica y consulta tu liquidación semanal." },
      { property: "og:title", content: "Control Cabify" },
      { property: "og:description", content: "Control financiero para conductores: producción, caja chica y liquidación semanal." },
    ],
  }),
  component: Login,
});

function Login() {
  const { login, session, hydrated } = useApp();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgot, setForgot] = useState(false);

  useEffect(() => {
    if (hydrated && session) navigate({ to: session.role === "admin" ? "/admin" : "/conductor" });
  }, [hydrated, session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!usuario || !password) return setError("Ingresa tu usuario y contraseña.");
    setLoading(true);
    const r = await login(usuario, password);
    setLoading(false);
    if (!r.ok) setError(r.error);
  };

  return (
    <MobileShell>
      <DemoBanner />
      <div className="flex min-h-[calc(100vh-28px)] flex-col justify-center px-6 py-10">
        <Logo className="mb-10" />
        <h1 className="text-3xl font-extrabold tracking-tight">Controla tu producción</h1>
        <p className="mt-2 text-muted-foreground">Registra tu día y conoce tu ganancia semanal al instante.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="u">Usuario o correo</Label>
            <Input id="u" autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} className="h-12" placeholder="jperez" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p">Contraseña</Label>
            <div className="relative">
              <Input id="p" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pr-12" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground" aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}>
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-negative-soft px-3 py-2.5 text-sm text-negative">
              <AlertCircle className="size-4 shrink-0" /> {error}
            </div>
          )}
          <Button type="submit" size="xl" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />} Iniciar sesión
          </Button>
          <button type="button" onClick={() => setForgot(true)} className="block w-full text-center text-sm font-medium text-primary">
            Olvidé mi contraseña
          </button>
        </form>

        <div className="mt-10 rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
          <p className="mb-2 font-semibold text-foreground">Cuentas de demostración</p>
          <div className="flex flex-wrap gap-2">
            {[
              ["jperez", "1234", "Conductor: Juan"],
              ["mrojas", "1234", "Conductora: María"],
              ["admin", "admin123", "Administrador"],
            ].map(([u, p, l]) => (
              <Button key={u} type="button" variant="outline" size="sm" onClick={() => { setUsuario(u); setPassword(p); setError(""); }}>
                {l}
              </Button>
            ))}
          </div>
          <p className="mt-2">El acceso es simulado en este prototipo; no hay autenticación real.</p>
        </div>
      </div>

      <Dialog open={forgot} onOpenChange={setForgot}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar contraseña</DialogTitle>
            <DialogDescription>Comunícate con el administrador de tu flota para restablecer tu contraseña. En la versión final recibirás un enlace por correo.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </MobileShell>
  );
}
