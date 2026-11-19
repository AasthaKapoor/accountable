import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { isLate, positionBetween, roundPence, todayISO, totals } from "../../lib/rules";
import { defaultProbability, isOpen, type Stage } from "../../lib/stages";
import type { ColumnTotals, Deal, MoveResult, Pipeline } from "../../lib/types";

export const PIPELINE_KEY = ["pipeline"] as const;

function columnTotals(stage: Stage, deals: Deal[]): ColumnTotals {
  return isOpen(stage) ? totals(deals) : { value_pence: null, expected_pence: null, count: deals.length };
}

/**
 * The board after moving one deal to `index` in `stage` (counted without the moved deal),
 * with the stage-change rules applied and every total worked out again.
 */
export function applyMove(pipeline: Pipeline, dealId: number, stage: Stage, index: number, today: string): Pipeline {
  let moving: Deal | undefined;
  const columns = pipeline.columns.map((column) => ({
    ...column,
    deals: column.deals.filter((d) => {
      if (d.id !== dealId) return true;
      moving = d;
      return false;
    }),
  }));
  if (!moving) return pipeline;

  const target = columns.find((c) => c.stage === stage)!;
  const at = Math.max(0, Math.min(index, target.deals.length));
  const before = target.deals[at - 1] ?? null;
  const after = target.deals[at] ?? null;
  let deal: Deal = { ...moving, position: positionBetween(before?.position ?? null, after?.position ?? null) };
  if (stage !== moving.stage) {
    const probability = defaultProbability(stage);
    const close_date = isOpen(stage) ? deal.close_date : today;
    deal = {
      ...deal,
      stage,
      probability,
      probability_is_manual: false,
      close_date,
      is_late: isLate(stage, close_date, today),
      expected_pence: roundPence(deal.value_pence * probability),
    };
  }
  target.deals = [...target.deals.slice(0, at), deal, ...target.deals.slice(at)];

  return {
    columns: columns.map((c) => ({ ...c, totals: columnTotals(c.stage, c.deals) })),
    totals: totals(columns.flatMap((c) => c.deals)),
  };
}

/** The ids of the cards directly above and below `index` in `stage`, ignoring the moved deal. */
export function neighbours(pipeline: Pipeline, dealId: number, stage: Stage, index: number) {
  const deals = pipeline.columns.find((c) => c.stage === stage)!.deals.filter((d) => d.id !== dealId);
  return { before_id: deals[index - 1]?.id ?? null, after_id: deals[index]?.id ?? null };
}

/** Put the server's answer in place of the optimistic guess. */
export function withServerResult(pipeline: Pipeline, result: MoveResult): Pipeline {
  return {
    columns: pipeline.columns.map((c) => ({
      ...c,
      deals: c.deals.map((d) => (d.id === result.deal.id ? result.deal : d)),
      totals: result.totals.columns[c.stage],
    })),
    totals: result.totals.board,
  };
}

interface MoveVars {
  dealId: number;
  stage: Stage;
  before_id: number | null;
  after_id: number | null;
  previous: Pipeline;
}

/**
 * Moves a deal on the board straight away, then tells the server.
 * If the server rejects the move, the board goes back and a toast says why.
 */
export function useMoveDeal() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationKey: ["move"],
    mutationFn: ({ dealId, stage, before_id, after_id }: MoveVars) =>
      api.post<MoveResult>(`/deals/${dealId}/move`, { stage, before_id, after_id }),
    onSuccess: (result) => {
      queryClient.setQueryData<Pipeline>(PIPELINE_KEY, (current) => current && withServerResult(current, result));
    },
    onError: (error, vars) => {
      queryClient.setQueryData(PIPELINE_KEY, vars.previous);
      toast(`Couldn't move the deal. ${error instanceof Error ? error.message : ""}`.trim());
    },
    onSettled: () => {
      // Lists, records and the dashboard all show stages and totals.
      void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "pipeline" });
      if (queryClient.isMutating({ mutationKey: ["move"] }) <= 1) void queryClient.invalidateQueries({ queryKey: PIPELINE_KEY });
    },
  });

  return (dealId: number, stage: Stage, index: number) => {
    const previous = queryClient.getQueryData<Pipeline>(PIPELINE_KEY);
    if (!previous) return;
    const ids = neighbours(previous, dealId, stage, index);
    void queryClient.cancelQueries({ queryKey: PIPELINE_KEY });
    // Synchronous, so the card lands where it was dropped with no flicker.
    queryClient.setQueryData(PIPELINE_KEY, applyMove(previous, dealId, stage, index, todayISO()));
    mutation.mutate({ dealId, stage, ...ids, previous });
  };
}
