import { Link } from "react-router";
import { Icon } from "../../components/Icon";
import { formatMoney } from "../../lib/format";
import { stageInfo } from "../../lib/stages";
import type { Dashboard } from "../../lib/types";
import { monthName } from "./months";
import { RevenueChart } from "./RevenueChart";
import { StageBar } from "./StageBar";

function WonChange({ thisMonth, lastMonth, lastName }: { thisMonth: number; lastMonth: number; lastName: string }) {
  if (lastMonth === 0) return <>{thisMonth === 0 ? "Nothing won yet" : `Nothing won in ${lastName}`}</>;
  const change = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  if (change === 0) return <>Same as {lastName}</>;
  return (
    <>
      <Icon name={change > 0 ? "up" : "down"} />
      {change > 0 ? "Up" : "Down"} {Math.abs(change)}% on {lastName}
    </>
  );
}

function Ring({ percent }: { percent: number }) {
  const circumference = 2 * Math.PI * 15;
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true">
      <circle cx="19" cy="19" r="15" fill="none" stroke="rgba(205,216,219,0.15)" strokeWidth="5" />
      {percent > 0 && (
        <circle
          cx="19" cy="19" r="15" fill="none" stroke="#06D6A0" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${(circumference * percent) / 100} ${circumference}`} transform="rotate(-90 19 19)"
        />
      )}
    </svg>
  );
}

export function Hero({ data }: { data: Dashboard }) {
  const lastName = monthName(data.months[data.months.length - 2].month, "long");
  const { win_rate: rate } = data;
  return (
    <section className="hero span-12" aria-label="Headline figures">
      <div>
        <div className="hero-label">Open pipeline value</div>
        <div className="hero-big" data-testid="open-value">{formatMoney(data.totals.value_pence)}</div>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-label">Expected revenue</div>
            <div className="v" data-testid="expected">{formatMoney(data.totals.expected_pence)}</div>
            <div className="s">Value times probability</div>
          </div>
          <div className="hero-stat">
            <div className="hero-label">Won this month</div>
            <div className="v" data-testid="won-this-month">{formatMoney(data.won_this_month_pence)}</div>
            <div className="s">
              <WonChange thisMonth={data.won_this_month_pence} lastMonth={data.won_last_month_pence} lastName={lastName} />
            </div>
          </div>
          <div className="hero-stat">
            <div className="hero-label">Win rate, {rate.days} days</div>
            <div className="ring">
              <Ring percent={rate.percent ?? 0} />
              <div>
                <div className="v" data-testid="win-rate">{rate.percent === null ? "None yet" : `${rate.percent}%`}</div>
                <div className="s" data-testid="win-counts">{rate.won} won, {rate.lost} lost</div>
              </div>
            </div>
          </div>
          <div className="hero-stat">
            <div className="hero-label">Open deals</div>
            <div className="v" data-testid="open-count">{data.totals.count}</div>
            <div className="s" data-testid="late-count">
              {data.late_count} running late
            </div>
          </div>
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="hero-chart-head">
          <h2>Revenue won by month</h2>
          <span className="hero-label">Last 12 months</span>
        </div>
        <RevenueChart months={data.months} />
      </div>
      <div className="hero-stack">
        <div className="hero-stack-title">
          <h2>Pipeline by stage</h2>
          <Link to="/pipeline">View pipeline</Link>
        </div>
        <StageBar stages={data.stages} />
      </div>
    </section>
  );
}

export const stageColourOnDark = (stage: Parameters<typeof stageInfo>[0]) => stageInfo(stage).colourOnDark;
