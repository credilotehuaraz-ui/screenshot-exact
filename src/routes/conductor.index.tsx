import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TrendingUp, Wallet, Undo2, CalendarCheck, Coins, Receipt, CalendarDays, FileText, ChevronRight, ArrowUpRight, CheckCircle2, AlertCircle, ArrowDownLeft, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DemoBanner, StatCard, StatusBadge, SyncIndicator, WeekSelector, cashTone, Money, EmptyState, Section } from "@/components/app/primitives";
import { useApp, useCurrentDriver, useDriverRecords } from "@/lib/store";
import { computeSettlement, computeWeekCaja, computeNetPendingBalance } from "@/lib/finance";
import { fmt, parseMoney } from "@/lib/money";
import { formatShort, todayLima, weekStart } from "@/lib/dates";

export const Route = createFileRoute("/conductor/")({
  component: DriverHome,
});

function DriverHome() {
  const driver = useCurrentDriver();
  const { session, cashTransactions, requestCashReturn, requestDriverRefund, updateCashTransactionStatus } = useApp();
  const recs = useDriverRecords(driver?.id);
  const today = todayLima();
  const [week, setWeek] = useState(weekStart(today));

  const [depositModal, setDepositModal] = useState(false);
  const [requestReturnModal, setRequestReturnModal] = useState(false);
  const [montoTx, setMontoTx] = useState("");
  const [obsTx, setObsTx] = useState("");

  const s = useMemo(() => computeSettlement(week, recs, today), [week, recs, today]);

  // Transacciones de caja de este conductor filtradas por el periodo de la semana seleccionada
  const driverTxs = useMemo(() => cashTransactions.filter((t) => t.driverId === driver?.id), [cashTransactions, driver?.id]);
  const netPending = useMemo(() => computeNetPendingBalance(s.cajaFinal, driverTxs, week), [s.cajaFinal, driverTxs, week]);

  const recent = useMemo(() => {
    const sorted = [...recs].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5);
    return sorted.map((r) => {
      const wk = recs.filter((x) => weekStart(x.fecha) === weekStart(r.fecha));
      return { r, caja: computeWeekCaja(wk)[r.fecha] };
    });
  }, [recs]);

  if (!driver) return null;

  // Alertas activas para la semana seleccionada
  const adminReminder = driverTxs.find((t) => t.tipo === "recordatorio_empresa" && t.estado === "pendiente" && t.period_id === week);
  const adminRefundToConfirm = driverTxs.find((t) => t.tipo === "reembolso_empresa" && t.estado === "pendiente" && t.period_id === week);

  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Lima", hour: "numeric", hour12: false }).format(new Date()));
  const greet = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  // Enviar comprobante de depósito realizado por el Conductor
  const handleSendDepositProof = () => {
    const cents = parseMoney(montoTx);
    if (!cents || cents <= 0) return toast.error("Ingresa un monto válido.");

    const montoFormatted = (cents / 100).toFixed(2);
    requestCashReturn(driver.id, cents, obsTx, week);

    const waMsg = encodeURIComponent(`Hola, adjunto captura del depósito de devolución de caja chica de ${driver.nombre} (${driver.placa}) por S/ ${montoFormatted} para la semana del ${week}. ${obsTx ? `Nota: ${obsTx}` : ""}`);
    window.open(`https://wa.me/51969841802?text=${waMsg}`, "_blank");

    toast.success("Comprobante enviado a verificación", { description: "Se notificó al administrador." });
    setDepositModal(false);
    setMontoTx("");
    setObsTx("");
  };

  // Solicitar devolución a la Empresa cuando la caja es negativa (tipo: 'solicitud_conductor')
  const handleRequestCompanyReturn = () => {
    const cents = parseMoney(montoTx);
    if (!cents || cents <= 0) return toast.error("Ingresa un monto válido.");

    const montoFormatted = (cents / 100).toFixed(2);
    requestDriverRefund(driver.id, cents, obsTx, week);

    const waMsg = encodeURIComponent(`Hola, solicito la devolución de caja chica a mi favor para ${driver.nombre} (${driver.placa}) por S/ ${montoFormatted} para la semana del ${week}. ${obsTx ? `Nota: ${obsTx}` : ""}`);
    window.open(`https://wa.me/51969841802?text=${waMsg}`, "_blank");

    toast.success("Solicitud enviada al Administrador", { description: "Se le notificó para que efectúe el depósito." });
    setRequestReturnModal(false);
    setMontoTx("");
    setObsTx("");
  };

  return (
    <div>
      <DemoBanner />
      <header className="px-4 pb-4 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{greet},</p>
            <h1 className="text-2xl font-extrabold tracking-tight">{session?.nombre.split(" ")[0]}</h1>
            <span className="mt-1 inline-block rounded-md border bg-card px-2 py-0.5 text-xs font-semibold tracking-wider">{driver.placa}</span>
          </div>
          <SyncIndicator />
        </div>
        <div className="mt-4">
          <WeekSelector value={week} onChange={setWeek} />
        </div>
      </header>

      {/* Alerta si el Administrador envió un recordatorio de cobro a favor de la Empresa (CAJA POSITIVA) */}
      {adminReminder && (
        <div className="mx-4 mb-3 rounded-2xl border border-warning/40 bg-warning-soft p-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-6 shrink-0 text-warning mt-0.5" />
            <div className="flex-1">
              <h3 className="font-extrabold text-sm text-foreground">Recordatorio del Administrador</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                El Administrador te recuerda efectuar el reembolso de <span className="font-bold text-foreground">S/ {(adminReminder.monto / 100).toFixed(2)}</span> a favor de la Empresa para la semana del {week}.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="h-8 text-xs font-bold" onClick={() => { setMontoTx((adminReminder.monto / 100).toFixed(2)); setDepositModal(true); }}>
                  <ArrowUpRight className="mr-1 size-3.5" /> Enviar comprobante
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerta si la Empresa registró un depósito para que el Conductor lo confirme (CAJA NEGATIVA) */}
      {adminRefundToConfirm && (
        <div className="mx-4 mb-3 rounded-2xl border border-positive/40 bg-positive-soft p-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <Coins className="size-6 shrink-0 text-positive mt-0.5" />
            <div className="flex-1">
              <h3 className="font-extrabold text-sm text-foreground">Depósito de la Empresa por confirmar</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                El administrador ha registrado un depósito a tu favor por <span className="font-bold text-foreground">S/ {(adminRefundToConfirm.monto / 100).toFixed(2)}</span> para la semana del {week}.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="h-8 text-xs font-bold bg-positive text-positive-foreground hover:bg-positive/90"
                  onClick={() => {
                    updateCashTransactionStatus(adminRefundToConfirm.id, "confirmado");
                    toast.success("Depósito verificado y confirmado.");
                  }}
                >
                  <CheckCircle2 className="mr-1 size-3.5" /> Confirmar depósito
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-bold text-negative border-negative/30"
                  onClick={() => {
                    updateCashTransactionStatus(adminRefundToConfirm.id, "no_encontrado");
                    toast.error("Notificado como 'No recibí el depósito'.");
                  }}
                >
                  <XCircle className="mr-1 size-3.5" /> No recibí el depósito
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 px-4">
        <StatCard className="col-span-2" icon={TrendingUp} label="Producción de la semana" value={fmt(s.produccionTotal)} hint={`${s.diasTrabajados} día(s) trabajado(s)`} />
        <StatCard icon={Coins} label="Ganancia semanal" value={fmt(s.ganancia)} tone="primary" hint={s.definitivo ? "Definitiva" : "Provisional"} />
        <StatCard icon={Wallet} label="Caja chica acumulada" value={fmt(s.cajaFinal)} tone={cashTone(s.cajaFinal)} hint={s.cajaFinal > 0 ? "Debes a la empresa" : s.cajaFinal < 0 ? "Empresa te debe" : "Al día"} />
        <StatCard icon={Undo2} label="Devolución pendiente" value={fmt(netPending.devolucionPendiente)} tone={netPending.devolucionPendiente > 0 ? "negative" : "default"} hint={netPending.devolucionPendiente > 0 ? "Saldo neto de la semana" : "Al día"} />
      </div>

      {/* ACCIONES DINÁMICAS SEGÚN EL SIGNO DE CAJA CHICA DE LA SEMANA */}
      <div className="px-4 pt-3">
        {s.cajaFinal > 0 ? (
          // CASO 1: POSITIVO -> CONDUCTOR DEBE A LA EMPRESA
          <div className="rounded-2xl border border-negative/30 bg-negative-soft p-3.5 text-center space-y-2">
            <p className="text-xs font-bold text-negative">Debes S/ {(s.cajaFinal / 100).toFixed(2)} a la Empresa (Semana {week})</p>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" className="font-bold bg-negative text-negative-foreground hover:bg-negative/90" onClick={() => { setMontoTx((netPending.devolucionPendiente / 100).toFixed(2)); setDepositModal(true); }}>
                <ArrowUpRight className="mr-1 size-3.5" /> Realizar depósito
              </Button>
              <Button size="sm" variant="outline" className="font-bold border-negative/30 text-negative" onClick={() => { setMontoTx((netPending.devolucionPendiente / 100).toFixed(2)); setDepositModal(true); }}>
                Enviar comprobante
              </Button>
            </div>
          </div>
        ) : s.cajaFinal < 0 ? (
          // CASO 2: NEGATIVO -> LA EMPRESA DEBE AL CONDUCTOR
          <div className="rounded-2xl border border-positive/30 bg-positive-soft p-3.5 text-center space-y-2">
            <p className="text-xs font-bold text-positive">La Empresa te debe S/ {(Math.abs(s.cajaFinal) / 100).toFixed(2)} (Semana {week})</p>
            <Button size="lg" className="w-full font-bold bg-positive text-positive-foreground hover:bg-positive/90" onClick={() => { setMontoTx((netPending.devolucionPendiente / 100).toFixed(2)); setRequestReturnModal(true); }}>
              <ArrowDownLeft className="mr-1 size-4" /> Solicitar devolución al Administrador
            </Button>
          </div>
        ) : (
          // CASO 3: CERO -> CAJA CHICA AL DÍA
          <div className="rounded-2xl border border-border bg-card p-3 text-center">
            <p className="text-xs font-extrabold text-positive">✓ Caja Chica al día: S/ 0.00 (Semana {week})</p>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 px-4">
        <ActionLink to="/conductor/cuadre/$fecha" params={{ fecha: today }} icon={Receipt} label="Ver cuadre de hoy" />
        <ActionLink to="/conductor/historial" icon={CalendarDays} label="Historial diario" />
        <ActionLink to="/conductor/liquidacion" icon={Coins} label="Liquidación semanal" />
        <ActionLink to="/conductor/informe" icon={FileText} label="Informe semanal" />
      </div>

      {/* Modal Realizar Depósito / Enviar Comprobante (Conductor -> Empresa) */}
      <Dialog open={depositModal} onOpenChange={setDepositModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Realizar depósito a la Empresa</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <div className="rounded-xl border bg-primary-soft p-2.5 text-xs font-semibold text-primary">
              📌 Semana correspondiente: <span className="font-extrabold text-foreground">{week}</span>
            </div>

            <div className="rounded-xl border bg-muted/60 p-3 text-xs text-muted-foreground leading-relaxed">
              <p className="flex items-center gap-1.5 font-bold text-foreground mb-1">
                <AlertCircle className="size-4 text-primary shrink-0" /> Instrucciones de pago
              </p>
              Realiza el depósito/transferencia a la empresa para la semana del {week} y envía el comprobante por WhatsApp al administrador para su verificación.
            </div>

            <div className="space-y-1.5">
              <Label>Monto a depositar (S/)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">S/</span>
                <Input
                  inputMode="decimal"
                  placeholder="0.00"
                  value={montoTx}
                  onChange={(e) => setMontoTx(e.target.value)}
                  className="num h-12 pl-9 text-lg font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nota / N° Operación (Opcional)</Label>
              <Input placeholder="Ej: Yape / BCP N° 849201" value={obsTx} onChange={(e) => setObsTx(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="mt-3">
            <Button size="lg" className="w-full font-bold" onClick={handleSendDepositProof}>
              Enviar comprobante por WhatsApp (+51 969841802)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Solicitar Devolución (Conductor -> Admin) */}
      <Dialog open={requestReturnModal} onOpenChange={setRequestReturnModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar devolución al Administrador</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <div className="rounded-xl border bg-primary-soft p-2.5 text-xs font-semibold text-primary">
              📌 Semana correspondiente: <span className="font-extrabold text-foreground">{week}</span>
            </div>

            <div className="space-y-1.5">
              <Label>Monto de devolución solicitado (S/)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">S/</span>
                <Input
                  inputMode="decimal"
                  placeholder="0.00"
                  value={montoTx}
                  onChange={(e) => setMontoTx(e.target.value)}
                  className="num h-12 pl-9 text-lg font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nota / Datos para el depósito (Opcional)</Label>
              <Input placeholder="Ej: Cuenta BCP / Yape 969410200" value={obsTx} onChange={(e) => setObsTx(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="mt-3">
            <Button size="lg" className="w-full font-bold" onClick={handleRequestCompanyReturn}>
              Solicitar por WhatsApp (+51 969841802)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionLink(props: { to: "/conductor/historial" | "/conductor/liquidacion" | "/conductor/informe" | "/conductor/cuadre/$fecha"; params?: { fecha: string }; icon: typeof Receipt; label: string }) {
  const Icon = props.icon;
  return (
    <Link to={props.to} params={props.params as never} className="surface flex items-center gap-2.5 px-3 py-3.5 text-sm font-semibold">
      <span className="rounded-lg bg-primary-soft p-2 text-primary">
        <Icon className="size-4" />
      </span>
      {props.label}
    </Link>
  );
}
