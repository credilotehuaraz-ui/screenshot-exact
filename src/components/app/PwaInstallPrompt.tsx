import { useEffect, useState } from "react";
import { Download, Share, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Comprobar si ya está ejecutándose como PWA instalada
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (standalone) {
      setIsStandalone(true);
      return;
    }

    // 2. Detectar si es un dispositivo iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(ios);

    // 3. Capturar el evento de instalación en Android / Chrome / Windows
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Mostrar también aviso para iOS si no está instalada
    if (ios) {
      const dismissed = localStorage.getItem("pwa_prompt_dismissed_ios");
      if (!dismissed) setShowPrompt(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setShowPrompt(false);
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (isIos) {
      localStorage.setItem("pwa_prompt_dismissed_ios", "true");
    }
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed inset-x-0 bottom-3 z-50 mx-auto max-w-[420px] px-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="relative rounded-2xl border border-primary/30 bg-background/95 p-4 shadow-float backdrop-blur-md">
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Cerrar aviso de instalación"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Smartphone className="size-6" />
          </div>

          <div className="min-w-0 flex-1 pr-4">
            <h3 className="font-extrabold text-sm text-foreground">Instalar Control Cabify</h3>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              {isIos
                ? "Agrega la app a tu pantalla de inicio para un acceso rápido y en pantalla completa."
                : "Instala la app en tu teléfono para un acceso rápido sin barra de navegador."}
            </p>

            {isIos ? (
              <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-primary-soft p-2 text-[11px] font-semibold text-accent-foreground">
                <Share className="size-3.5 shrink-0 text-primary" />
                <span>Toca Compartir ⎋ y selecciona &quot;Agregar a inicio&quot; ➕</span>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" className="h-9 px-4 text-xs font-bold" onClick={handleInstallClick}>
                  <Download className="size-3.5 mr-1" /> Instalar App
                </Button>
                <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={handleDismiss}>
                  Ahora no
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
