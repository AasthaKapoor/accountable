import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { Icon } from "../../components/Icon";
import { PageHeader } from "../../components/Layout";
import { SkeletonPanel } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import type { Dashboard } from "../../lib/types";
import { DealForm } from "../deals/DealForm";
import { FollowUps } from "./FollowUps";
import { Funnel } from "./Funnel";
import { Hero } from "./Hero";
import { RecentActivity } from "./RecentActivity";
import { WonLostChart } from "./WonLostChart";
import "./dashboard.css";

export function DashboardPage() {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const query = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<Dashboard>("/dashboard") });
  useEffect(() => {
    if (query.error) toast(query.error.message);
  }, [query.error, toast]);

  const data = query.data;
  const newDeal = (
    <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
      <Icon name="plus" />
      New deal
    </button>
  );
  const noDeals = data && data.totals.count === 0 && data.months.every((m) => m.won_count === 0 && m.lost_count === 0);

  return (
    <>
      <PageHeader title="Dashboard" sub={format(data ? parseISO(data.today) : new Date(), "EEEE d MMM yyyy")}>
        {newDeal}
      </PageHeader>
      {data ? (
        <div className="dash-grid">
          {noDeals ? (
            <section className="panel span-12 welcome">
              <h2>Your pipeline at a glance</h2>
              <p>Add a deal and the figures, charts and funnel fill in here.</p>
              {newDeal}
            </section>
          ) : (
            <>
              <Hero data={data} />
              <Funnel funnel={data.funnel} />
              <WonLostChart months={data.months} />
            </>
          )}
          <FollowUps key={data.follow_ups.overdue.length ? "o" : "u"} followUps={data.follow_ups} />
          <RecentActivity activities={data.recent_activity} />
        </div>
      ) : query.isError ? (
        <div className="panel">
          <EmptyState message="Couldn't load the dashboard." action={<button className="btn btn-quiet" onClick={() => query.refetch()}>Try again</button>} />
        </div>
      ) : (
        <div className="dash-grid" aria-busy="true">
          <div className="span-12" style={{ height: 400, borderRadius: 16, background: "var(--ink)", opacity: 0.85 }} />
          <div className="span-8"><SkeletonPanel lines={6} /></div>
          <div className="span-4"><SkeletonPanel lines={6} /></div>
        </div>
      )}
      <DealForm open={adding} onOpenChange={setAdding} />
    </>
  );
}
