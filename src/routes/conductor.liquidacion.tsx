import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, WeekSelector } from "@/components/app/primitives";
import { WeeklySettlement } from "@/components/app/WeeklySettlement";
import { useCurrentDriver, useDriverRecords } from "@/lib/store";
import { computeSettlement } from "@/lib/finance";
import { addDays, todayLima, weekStart } from "@/lib/dates";

export const Route = createFileRoute("/conductor/liquidacion")({
  component: Liquidacion,
});

function Liquidacion() {
  const driver = useCurrentDriver();
  const recs = useDriverRecords(driver?.id);
  const today = todayLima();
  // Default to the last completed week, the one usually being settled.
  const [week, setWeek] = useState(addDays(weekStart(today), -7));
  const s = useMemo(() => computeSettlement(week, recs, today), [week, recs, today]);
  if (!driver) return null;
  return (
    <div>
      <PageHeader title="Liquidación semanal" subtitle={`${driver.nombre} · ${driver.placa}`} back="/conductor" />
      <div className="space-y-3 p-4">
        <WeekSelector value={week} onChange={setWeek} />
        <WeeklySettlement s={s} />
      </div>
    </div>
  );
}
