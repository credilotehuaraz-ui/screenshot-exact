import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2, Search, ShieldCheck, UserX, ShieldAlert } from "lucide-react";
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
import { useApp, type AdminUser } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/administradores")({
  component: Administradores,
});

type Draft = { id?: string; nombre: string; usuario: string; email: string; activo: boolean; password: string };
const empty: Draft = { nombre: "", usuario: "", email: "", activo: true, password: "" };

function Administradores() {
  const { session, admins, saveAdminUser, deleteAdminUser, setAdminUserActive } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUser | null>(null);
  const [err, setErr] = useState("");

  const isSuper = session?.role === "superadmin";

  const list = admins.filter((a) => `${a.nombre} ${a.usuario} ${a.email}`.toLowerCase().includes(q.toLowerCase()));

  const open = (a?: AdminUser) => {
    setErr("");
    setDraft(a ? { id: a.id, nombre: a.nombre, usuario: a.usuario, email: a.email, activo: a.activo, password: "" } : empty);
  };

  const submit = () => {
    if (!draft) return;
    if (!draft.nombre.trim() || !draft.usuario.trim()) return setErr("Nombre y usuario son obligatorios.");
    if (!draft.id && draft.password.length < 4) return setErr("Asigna una contraseña inicial (mín. 4 caracteres).");
    const r = saveAdminUser({ ...draft, nombre: draft.nombre.trim(), email: draft.email.trim() });
    if (!r.ok) return setErr(r.error!);
    toast.success(draft.id ? "Administrador actualizado" : "Administrador creado");
    setDraft(null);
  };

  return (
    <div>
      <PageHeader
        title="Administradores"
        subtitle={`${admins.length} cuentas de administración`}
        back="/admin"
        right={
          isSuper ? (
            <Button size="sm" onClick={() => open()}>
              <Plus /> Crear Admin
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-3 p-4">
        {!isSuper && (
          <div className="flex items-center gap-2 rounded-xl bg-warning-soft p-3 text-xs text-warning">
            <ShieldAlert className="size-4 shrink-0" />
            Solo el Superadministrador (`superadmin`) tiene permisos para crear o modificar administradores.
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar administrador por nombre o usuario" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 pl-9" />
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={UserX}
            title="Sin administradores adicionales"
            text={isSuper ? "Presiona 'Crear Admin' arriba para agregar una nueva cuenta de administración." : "Aún no se han creado administradores en el sistema."}
            action={
              isSuper ? (
                <Button onClick={() => open()}>
                  <Plus /> Crear primer administrador
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="space-y-2">
            {list.map((a) => (
              <li key={a.id} className={cn("surface p-3.5", !a.activo && "opacity-70")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-base">{a.nombre}</p>
                      <span className="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary">Admin</span>
                    </div>
                    <p className="text-xs text-muted-foreground">@{a.usuario} · {a.email || "sin correo"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Alta {a.creado}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[11px] font-semibold", a.activo ? "text-positive" : "text-muted-foreground")}>
                      {a.activo ? "Activo" : "Inactivo"}
                    </span>
                    <Switch
                      checked={a.activo}
                      disabled={!isSuper}
                      onCheckedChange={(v) => setAdminUserActive(a.id, v)}
                      aria-label="Activar o desactivar administrador"
                    />
                  </div>
                </div>

                {isSuper && (
                  <div className="mt-3.5 grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => open(a)} className="text-xs">
                      <Pencil className="size-3.5" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingAdmin(a)}
                      className="text-xs text-negative hover:bg-negative-soft hover:text-negative"
                    >
                      <Trash2 className="size-3.5" /> Eliminar
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dialog para Crear / Editar Administrador */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar Administrador" : "Crear nuevo Administrador"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              {([["nombre", "Nombre completo"], ["usuario", "Usuario de acceso"], ["email", "Correo electrónico"]] as const).map(([k, l]) => (
                <div key={k} className="space-y-1.5">
                  <Label htmlFor={k}>{l}</Label>
                  <Input id={k} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} placeholder={k === "usuario" ? "Ej: admin_turno" : undefined} />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label htmlFor="pw">{draft.id ? "Nueva contraseña (opcional)" : "Contraseña inicial"}</Label>
                <Input id="pw" type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} placeholder="Mínimo 4 caracteres" />
                <p className="text-xs text-muted-foreground">La contraseña permitirá el acceso al panel administrativo.</p>
              </div>
              {err && <p className="text-sm text-negative font-medium">{err}</p>}
            </div>
          )}
          <DialogFooter>
            <Button onClick={submit}>Guardar Administrador</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmación de Eliminación */}
      <AlertDialog open={!!deletingAdmin} onOpenChange={(o) => !o && setDeletingAdmin(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar Administrador?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la cuenta administrativa de <span className="font-semibold text-foreground">{deletingAdmin?.nombre}</span> (@{deletingAdmin?.usuario}). Ya no podrá ingresar al panel de control.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-negative text-negative-foreground hover:bg-negative/90"
              onClick={() => {
                if (deletingAdmin) {
                  deleteAdminUser(deletingAdmin.id);
                  toast.success(`Administrador ${deletingAdmin.nombre} eliminado`);
                  setDeletingAdmin(null);
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
