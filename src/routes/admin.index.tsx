import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Users, TrendingUp, Coins, Wallet, Undo2, AlertTriangle, LogOut, PlusCircle, CheckCircle, XCircle, ArrowDownLeft, BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DemoBanner, Logo, Section, StatCard, SyncIndicator, WeekSelector, Money, cashTone } from "@/components/app/primitives";
import { useApp } from "@/lib/store";
import { computeSettlement, computeNetPendingBalance } from "@/lib/finance";
import { fmt, parseMoney } from "@/lib/money";
import { formatDateTime, formatShort, todayLima, weekStart } from "@/lib/dates";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { drivers, records, audit, cashTransactions, updateCashTransactionStatus, requestCompanyRefund, sendRefundReminder, logout } = useApp();
  const navigate = useNavigate();
  const today = todayLima();
  const [week, setWeek] = useState(weekStart(today));
  const [filter, setFilter] = useState("todos");

  const [refundModal, setRefundModal] = useState(false);
  const [reminderModal, setReminderModal] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [montoTx, setMontoTx] = useState("");
  const [obsTx, setObsTx] = useState("");

  const active = drivers.filter((d) => d.activo && (filter === "todos" || d.id === filter));
  const rows = useMemo(
    () => active.map((d) => {
      const driverRecs = records.filter((r) => r.driverId === d.id);
      const s = computeSettlement(week, driverRecs, today);
      const driverTxs = cashTransactions.filter((t) => t.driverId === d.id);
      const netPending = computeNetPendingBalance(s.cajaFinal, driverTxs);
      return { d, s, netPending };
    }),
    [active, records, week, today, cashTransactions],
  );

  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
  const incompletos = rows.flatMap(({ d, s }) => s.dias.filter((x) => x.estado === "pendiente" || x.estado === "sin_datos").map((x) => ({ d, x })));

  // Transacciones enviadas por conductores pendientes de verificación por el admin
  const pendingComprobantes = cashTransactions.filter((t) => t.tipo === "devolucion_conductor" && t.estado === "comprobante_enviado");

  // Transacciones de solicitud enviadas por conductores (cuando caja es negativa)
  const pendingRequests = cashTransactions.filter((t) => t.tipo === "devolucion_conductor" && t.estado === "pendiente");

  const handleSendReminderToDriver = () => {
    const cents = parseMoney(montoTx);
    if (!selectedDriverId) return toast.error("Selecciona un conductor.");
    if (!cents || cents <= 0) return toast.error("Ingresa un monto válido.");

    const d = drivers.find((x) => x.id === selectedDriverId);
    sendRefundReminder(selectedDriverId, cents, obsTx);

    const montoFormatted = (cents / 100).toFixed(2);
    const waMsg = encodeURIComponent(`Hola ${d?.nombre}, la Empresa te recuerda efectuar el reembolso de S/ ${montoFormatted} a favor de la Empresa por saldo pendiente de caja chica. Por favor realiza el depósito y envía el comprobante.`);
    window.open(`https://wa.me/51969841802?text=${waMsg}`, "_blank");

    toast.success("Recordatorio enviado al conductor", { description: `Se notificó a ${d?.nombre}` });
    setReminderModal(false);
    setMontoTx("");
    setObsTx("");
  };

  const handleSendRefundToDriver = () => {
    const cents = parseMoney(montoTx);
    if (!selectedDriverId) return toast.error("Selecciona un conductor.");
    if (!cents || cents <= 0) return toast.error("Ingresa un monto válido.");

    const d = drivers.find((x) => x.id === selectedDriverId);
    requestCompanyRefund(selectedDriverId, cents, obsTx);

    const montoFormatted = (cents / 100).toFixed(2);
    const waMsg = encodeURIComponent(`Hola ${d?.nombre}, la Empresa ha registrado un depósito a tu favor por S/ ${montoFormatted} por devolución de caja chica. Por favor ingresa a tu aplicación para confirmarlo.`);
    window.open(`https://wa.me/51969841802?text=${waMsg}`, "_blank");

    toast.success("Depósito registrado", { description: `Notificado a ${d?.nombre} para su confirmación.` });
    setRefundModal(false);
    setMontoTx("");
    setObsTx("");
  };

  return (
    <div>
      <DemoBanner />
      <header className="space-y-3 px-4 pb-3 pt-5">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-1">
            <SyncIndicator compact />
            <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={() => { logout(); navigate({ to: "/" }); }}>
              <LogOut />
            </Button>
          </div>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Panel administrativo</h1>
        <WeekSelector value={week} onChange={setWeek} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm font-medium">
          <option value="todos">Todos los conductores</option>
          {drivers.filter((d) => d.activo).map((d) => (
            <option key={d.id} value={d.id}>{d.nombre} · {d.placa}</option>
          ))}
        </select>
      </header>

      <div className="px-4 pb-3 space-y-2">
        <Button asChild size="lg" className="w-full font-bold">
          <Link to="/admin/registro" search={{ fecha: today }}>
            <PlusCircle /> Registrar producción diaria
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-4">
        <StatCard icon={Users} label="Conductores activos" value={String(drivers.filter((d) => d.activo).length)} />
        <StatCard icon={TrendingUp} label="Producción semana" value={fmt(sum((r) => r.s.produccionTotal))} />
        <StatCard icon={Coins} label="Ganancias calculadas" value={fmt(sum((r) => r.s.ganancia))} tone="primary" />
        <StatCard icon={Undo2} label="Devoluciones pendientes" value={fmt(sum((r) => r.netPending.devolucionPendiente))} tone="negative" />
      </div>

      <div className="space-y-3 p-4">
        {/* Sección de Alertas: Comprobantes y Solicitudes de Devoluciones de Caja */}
        {(pendingComprobantes.length > 0 || pendingRequests.length > 0) && (
          <Section title={`Verificación de Caja Chica (${pendingComprobantes.length + pendingRequests.length} pendientes)`}>
            <div className="space-y-3">
              {/* Comprobantes enviados por conductores (Caja Positiva) */}
              {pendingComprobantes.map((t) => {
                const d = drivers.find((x) => x.id === t.driverId);
                return (
                  <div key={t.id} className="rounded-xl border border-warning/40 bg-warning-soft p-3.5 space-y-2">
                    <p className="text-xs text-foreground leading-relaxed">
                      Conductor <span className="font-extrabold">{d?.nombre ?? "Desconocido"}</span> de la unidad <span className="font-bold border rounded bg-background px-1.5 py-0.5">{d?.placa ?? "S/P"}</span> ha enviado un comprobante de pago por <span className="font-extrabold text-positive">S/ {(t.monto / 100).toFixed(2)}</span>. Verifica el pago.
                    </p>
                    {t.obs && <p className="text-[11px] text-muted-foreground italic">Nota: &quot;{t.obs}&quot;</p>}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        size="sm"
                        className="bg-positive hover:bg-positive/90 text-positive-foreground text-xs font-bold"
                        onClick={() => {
                          updateCashTransactionStatus(t.id, "aprobado");
                          toast.success("Pago verificado. Saldo de devolución actualizado.");
                        }}
                      >
                        <CheckCircle className="mr-1 size-3.5" /> Pago verificado
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-negative border-negative/30 hover:bg-negative-soft text-xs font-bold"
                        onClick={() => {
                          updateCashTransactionStatus(t.id, "no_encontrado");
                          toast.error("Marcado como Pago no encontrado.");
                        }}
                      >
                        <XCircle className="mr-1 size-3.5" /> Pago no encontrado
                      </Button>
                    </div>
                  </div>
                );
              })}

              {/* Solicitudes de devolución enviadas por conductores (Caja Negativa) */}
              {pendingRequests.map((t) => {
                const d = drivers.find((x) => x.id === t.driverId);
                return (
                  <div key={t.id} className="rounded-xl border border-primary/40 bg-primary-soft p-3.5 space-y-2">
                    <p className="text-xs text-foreground leading-relaxed">
                      Conductor <span className="font-extrabold">{d?.nombre ?? "Desconocido"}</span> de la unidad <span className="font-bold border rounded bg-background px-1.5 py-0.5">{d?.placa ?? "S/P"}</span> tiene una devolución pendiente de <span className="font-extrabold text-negative">S/ {(t.monto / 100).toFixed(2)}</span> y solicita el depósito correspondiente.
                    </p>
                    {t.obs && <p className="text-[11px] text-muted-foreground italic">Nota: &quot;{t.obs}&quot;</p>}

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="w-full bg-primary text-primary-foreground font-bold text-xs"
                        onClick={() => {
                          setSelectedDriverId(t.driverId);
                          setMontoTx((t.monto / 100).toFixed(2));
                          setRefundModal(true);
                        }}
                      >
                        <ArrowDownLeft className="mr-1 size-3.5" /> Registrar pago a Conductor
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Sección Estado de Caja Chica por Conductor */}
        <Section title="Estado de Caja Chica por Conductor">
          <ul className="divide-y space-y-1">
            {rows.map(({ d, s, netPending }) => (
              <li key={d.id} className="py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to="/admin/conductores/$id" params={{ id: d.id }} className="font-bold text-sm text-foreground hover:underline">
                      {d.nombre} ({d.placa})
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Caja chica bruta: <span className="font-semibold">{fmt(s.cajaFinal)}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    {s.cajaFinal > 0 ? (
                      <span className="inline-block text-xs font-bold text-negative bg-negative-soft px-2 py-0.5 rounded-full">
                        Debes a Empresa: {fmt(netPending.deudaConductorAEmpresa)}
                      </span>
                    ) : s.cajaFinal < 0 ? (
                      <span className="inline-block text-xs font-bold text-positive bg-positive-soft px-2 py-0.5 rounded-full">
                        Empresa debe: {fmt(netPending.deudaEmpresaAConductor)}
                      </span>
                    ) : (
                      <span className="inline-block text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        Caja chica al día: S/ 0.00
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones según el signo del saldo de caja chica */}
                <div className="mt-2.5 flex items-center justify-end gap-2">
                  {s.cajaFinal > 0 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold text-negative border-negative/30 hover:bg-negative-soft"
                      onClick={() => {
                        setSelectedDriverId(d.id);
                        setMontoTx((netPending.deudaConductorAEmpresa / 100).toFixed(2));
                        setReminderModal(true);
                      }}
                    >
                      <BellRing className="mr-1 size-3.5" /> Recordar / Solicitar reembolso a la Empresa
                    </Button>
                  ) : s.cajaFinal < 0 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold text-positive border-positive/30 hover:bg-positive-soft"
                      onClick={() => {
                        setSelectedDriverId(d.id);
                        setMontoTx((netPending.deudaEmpresaAConductor / 100).toFixed(2));
                        setRefundModal(true);
                      }}
                    >
                      <ArrowDownLeft className="mr-1 size-3.5" /> Registrar pago a Conductor
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Saldos pendientes de caja">
          {rows.filter((r) => r.s.cajaFinal !== 0).length === 0 ? (
            <p className="text-sm text-muted-foreground">Todas las cajas están al día (S/ 0.00).</p>
          ) : (
            rows.filter((r) => r.s.cajaFinal !== 0).map(({ d, s }) => (
              <div key={d.id} className="flex justify-between py-1 text-sm">
                <span><Wallet className="mr-1 inline size-3.5" />{d.nombre}</span>
                <Money c={s.cajaFinal} tone={cashTone(s.cajaFinal)} />
              </div>
            ))
          )}
        </Section>

        <Section title={`Registros incompletos (${incompletos.length})`}>
          {incompletos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todo completo.</p>
          ) : (
            incompletos.slice(0, 8).map(({ d, x }) => (
              <Link key={d.id + x.fecha} to="/admin/registro" search={{ driverId: d.id, fecha: x.fecha }} className="flex items-center justify-between py-1.5 text-sm">
                <span className="flex items-center gap-1.5"><AlertTriangle className="size-3.5 text-warning" />{d.nombre.split(" ")[0]} · <span className="capitalize">{formatShort(x.fecha)}</span></span>
                <span className="text-xs text-muted-foreground">{x.estado === "pendiente" ? "Pendiente" : "Sin datos"}</span>
              </Link>
            ))
          )}
        </Section>

        <Section title="Últimas modificaciones">
          <ul className="space-y-2">
            {audit.slice(0, 6).map((a) => (
              <li key={a.id} className="text-sm">
                <p><span className="font-medium">{a.by}</span> · {a.accion}</p>
                <p className="text-xs text-muted-foreground">Día {a.fecha} · {formatDateTime(a.at)}</p>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {/* Modal Recordar / Solicitar Reembolso a la Empresa (Admin -> Conductor) */}
      <Dialog open={reminderModal} onOpenChange={setReminderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recordar / Solicitar reembolso a la Empresa</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label>Conductor</Label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm font-medium"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} ({d.placa})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Monto adeudado a la empresa (S/)</Label>
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
              <Label>Nota para el conductor (Opcional)</Label>
              <Input placeholder="Ej: Favor depositar saldo acumulado" value={obsTx} onChange={(e) => setObsTx(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="mt-3">
            <Button size="lg" className="w-full font-bold bg-warning text-warning-foreground hover:bg-warning/90" onClick={handleSendReminderToDriver}>
              Enviar recordatorio por WhatsApp (+51 969841802)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Registrar Depósito a Conductor (Empresa -> Conductor) */}
      <Dialog open={refundModal} onOpenChange={setRefundModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar depósito a Conductor</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label>Conductor destinatario</Label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm font-medium"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} ({d.placa})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Monto depositado al conductor (S/)</Label>
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
              <Input placeholder="Ej: Depósito BCP N° 948201" value={obsTx} onChange={(e) => setObsTx(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="mt-3">
            <Button size="lg" className="w-full font-bold" onClick={handleSendRefundToDriver}>
              Registrar pago y notificar por WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
