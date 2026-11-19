import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { formatMoney, formatMoneyShort } from "../../lib/format";
import type { Dashboard } from "../../lib/types";
import { monthName } from "./months";

type Point = { label: string; month: string; won_pence: number; won_count: number };

function RevenueTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as Point;
  return (
    <div className="chart-tooltip">
      <strong>
        {monthName(point.month, "withYear")} · {point.won_count} deal{point.won_count === 1 ? "" : "s"} won
      </strong>
      <span className="mono">{formatMoney(point.won_pence)}</span>
    </div>
  );
}

const tick = { fill: "rgba(205, 216, 219, 0.6)", fontFamily: "JetBrains Mono", fontSize: 11 };

/** Revenue won per month, as a Sea Green line with a soft area fill, on the dark hero. */
export function RevenueChart({ months }: { months: Dashboard["months"] }) {
  const data: Point[] = months.map((m) => ({ ...m, label: monthName(m.month) }));
  return (
    <div className="hero-chart" role="img" aria-label="Revenue won by month for the last 12 months">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#06D6A0" stopOpacity={0.35} />
              <stop offset="1" stopColor="#06D6A0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(205, 216, 219, 0.1)" />
          <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} interval={0} />
          <YAxis tick={tick} axisLine={false} tickLine={false} width={52} tickFormatter={(v: number) => formatMoneyShort(v)} />
          <Tooltip content={RevenueTooltip} cursor={{ stroke: "rgba(205, 216, 219, 0.3)" }} />
          <Area
            type="linear"
            dataKey="won_pence"
            stroke="#06D6A0"
            strokeWidth={2.5}
            fill="url(#revenue-fill)"
            activeDot={{ r: 6, fill: "#06D6A0", stroke: "#073B4C", strokeWidth: 3 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
