import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/conductor/registrar")({
  validateSearch: (s: Record<string, unknown>): { fecha?: string } => ({ fecha: typeof s.fecha === "string" ? s.fecha : undefined }),
  component: Registrar,
});

function Registrar() {
  const navigate = useNavigate();

  useEffect(() => {
    toast.info("Acceso restringido", { description: "El registro diario es realizado únicamente por el administrador." });
    navigate({ to: "/conductor" });
  }, [navigate]);

  return (
    <div>
      <PageHeader title="Registro restringido" back="/conductor" />
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <ShieldAlert className="mb-3 size-12 text-warning" />
        <h2 className="text-lg font-bold">Vista de solo lectura</h2>
        <p className="mt-1 text-sm text-muted-foreground">El registro y modificación de producción diaria es gestionado únicamente por el administrador.</p>
        <Button className="mt-6" onClick={() => navigate({ to: "/conductor" })}>
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}
