import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, WeekSelector } from "@/components/app/primitives";
import { ReportCompact, ReportDetailed, ReportPanoramic } from "@/components/app/WeeklyReport";
import { SettlementWarning } from "@/components/app/WeeklySettlement";
import { useCurrentDriver, useDriverRecords } from "@/lib/store";
import { computeSettlement } from "@/lib/finance";
import { addDays, todayLima, weekStart } from "@/lib/dates";
import { settlementCsv, downloadCsv } from "@/lib/export";

export const Route = createFileRoute("/conductor/informe")({
  component: Informe,
});

function Informe() {
  const driver = useCurrentDriver();
  const recs = useDriverRecords(driver?.id);
  const today = todayLima();
  const [week, setWeek] = useState(addDays(weekStart(today), -7));
  const s = useMemo(() => computeSettlement(week, recs, today), [week, recs, today]);
  if (!driver) return null;
  return (
    <div>
      <PageHeader title="Informe semanal" subtitle={driver.placa} back="/conductor" />
      <div className="space-y-3 p-4">
        <WeekSelector value={week} onChange={setWeek} />
        <SettlementWarning s={s} />
        <Tabs defaultValue="detalle">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="detalle">Detalle</TabsTrigger>
            <TabsTrigger value="compacta">Compacta</TabsTrigger>
            <TabsTrigger value="panoramica">Panorámica</TabsTrigger>
          </TabsList>
          <TabsContent value="detalle">
            <ReportDetailed s={s} />
          </TabsContent>
          <TabsContent value="compacta">
            <ReportCompact s={s} driver={driver} />
          </TabsContent>
          <TabsContent value="panoramica">
            <p className="mb-2 text-xs text-muted-foreground">Plantilla horizontal para exportar. Desliza para ver completa.</p>
            <ReportPanoramic s={s} driver={driver} />
          </TabsContent>
        </Tabs>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" onClick={() => downloadCsv(`informe-${driver.usuario}-${week}.csv`, settlementCsv(s, driver))}>
            <Download /> CSV
          </Button>
          <Button variant="outline" size="lg" onClick={() => window.print()}>
            <Printer /> PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
