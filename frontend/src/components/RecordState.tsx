import { Link } from "react-router";
import { ApiError } from "../lib/api";
import { EmptyState } from "./EmptyState";
import { PageHeader } from "./Layout";
import { SkeletonPanel } from "./Skeleton";

/** Loading and error states for a record page. */
export function RecordState({ error, kind, back }: { error: unknown; kind: string; back: string }) {
  if (!error) {
    return (
      <>
        <PageHeader title="Loading" />
        <div className="record-grid">
          <SkeletonPanel lines={6} />
          <SkeletonPanel lines={8} />
        </div>
      </>
    );
  }
  const missing = error instanceof ApiError && error.status === 404;
  return (
    <>
      <PageHeader title={missing ? `${kind} not found` : `Couldn't load this ${kind.toLowerCase()}`} />
      <div className="panel">
        <EmptyState
          message={missing ? `This ${kind.toLowerCase()} may have been deleted.` : error instanceof Error ? error.message : "Something went wrong."}
          action={
            <Link className="btn btn-quiet" to={back}>
              Back to the list
            </Link>
          }
        />
      </div>
    </>
  );
}
