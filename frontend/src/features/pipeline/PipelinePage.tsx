import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { Icon } from "../../components/Icon";
import { PageHeader } from "../../components/Layout";
import { Skeleton } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import type { Stage } from "../../lib/stages";
import type { Pipeline } from "../../lib/types";
import { DealForm } from "../deals/DealForm";
import { Board } from "./Board";
import { PIPELINE_KEY } from "./move";
import { SummaryPanel } from "./SummaryPanel";
import "./pipeline.css";

export function PipelinePage() {
  const toast = useToast();
  const [adding, setAdding] = useState<Stage | null>(null);
  const query = useQuery({
    queryKey: PIPELINE_KEY,
    queryFn: () => api.get<Pipeline>("/pipeline"),
  });
  useEffect(() => {
    if (query.error) toast(query.error.message);
  }, [query.error, toast]);

  const newDeal = (
    <button type="button" className="btn btn-primary" onClick={() => setAdding("new")}>
      <Icon name="plus" />
      New deal
    </button>
  );
  const pipeline = query.data;
  const empty = pipeline && pipeline.columns.every((c) => c.deals.length === 0);

  return (
    <>
      <PageHeader title="Pipeline">{newDeal}</PageHeader>
      {pipeline ? (
        <>
          <SummaryPanel pipeline={pipeline} />
          <section className="panel board-panel" aria-label="Board">
            {empty && <EmptyState compact message="No deals yet. Add one to any column." />}
            <Board pipeline={pipeline} onAdd={setAdding} />
          </section>
        </>
      ) : query.isError ? (
        <div className="panel">
          <EmptyState message="Couldn't load the pipeline." action={<button className="btn btn-quiet" onClick={() => query.refetch()}>Try again</button>} />
        </div>
      ) : (
        <>
          <div className="summary" aria-busy="true" style={{ height: 98 }} />
          <div className="panel board-panel" aria-busy="true" aria-label="Loading">
            <div className="board">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="col" style={{ background: "var(--bg)" }}>
                  <Skeleton width="60%" height={18} />
                  <Skeleton height={110} />
                  <Skeleton height={110} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      <DealForm open={adding !== null} onOpenChange={(o) => !o && setAdding(null)} defaults={{ stage: adding ?? "new" }} />
    </>
  );
}
