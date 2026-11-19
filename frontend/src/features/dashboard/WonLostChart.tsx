import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { Panel } from "../../components/Panel";
import type { Dashboard } from "../../lib/types";
import { monthName } from "./months";

type Point = { month: string; label: string; won_count: number; lost_count: number };

function WonLostTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as Point;
  return (
    <div className="chart-tooltip">
      <strong>{monthName(point.month, "withYear")}</strong>
      <span className="mono">
        {point.won_count} won, {point.lost_count} lost
      </span>
    </div>
  );
}

const tick = { fill: "rgba(7, 59, 76, 0.65)", fontFamily: "JetBrains Mono", fontSize: 11 };

/** Deals won and lost per month, stacked: Sea Green for won, Coral for lost. */
export function WonLostChart({ months }: { months: Dashboard["months"] }) {
  const data: Point[] = months.map((m) => ({ ...m, label: monthName(m.month).charAt(0) }));
  return (
    <Panel
      title="Deals won and lost"
      className="span-4"
      actions={
        <div className="legend">
          <span><i style={{ background: "var(--primary)" }} />Won</span>
          <span><i style={{ background: "var(--tertiary)" }} />Lost</span>
        </div>
      }
    >
      <div style={{ height: 250 }} role="img" aria-label="Deals won and lost by month for the last 12 months">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 4, bottom: 0, left: -24 }} barSize={16}>
            <CartesianGrid vertical={false} stroke="rgba(7, 59, 76, 0.08)" />
            <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={tick} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={WonLostTooltip} cursor={{ fill: "rgba(7, 59, 76, 0.05)" }} />
            <Bar dataKey="won_count" stackId="deals" fill="#06D6A0" radius={[3, 3, 3, 3]} isAnimationActive={false} />
            <Bar dataKey="lost_count" stackId="deals" fill="#F78C6B" radius={[3, 3, 3, 3]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
