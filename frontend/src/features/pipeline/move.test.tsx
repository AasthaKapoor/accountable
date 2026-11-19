import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ToastProvider } from "../../components/Toast";
import type { Deal, Pipeline } from "../../lib/types";
import { STAGE_KEYS, type Stage } from "../../lib/stages";
import { totals } from "../../lib/rules";
import { applyMove, neighbours, PIPELINE_KEY, useMoveDeal } from "./move";

const TODAY = "2026-11-19";

function deal(id: number, stage: Stage, position: number, value_pence = 100_000, close_date = "2026-12-31"): Deal {
  const probability = { new: 10, qualified: 25, proposal: 50, negotiation: 75, won: 100, lost: 0 }[stage];
  return {
    id, name: `Deal ${id}`, organization_id: 1, organization_name: "Acme", contact_id: 1, contact_name: "Ann",
    stage, value_pence, probability, probability_is_manual: false, close_date, position,
    furthest_stage: stage, is_late: false, expected_pence: (value_pence * probability) / 100,
  };
}

function board(deals: Deal[]): Pipeline {
  const columns = STAGE_KEYS.map((stage) => {
    const ds = deals.filter((d) => d.stage === stage);
    return { stage, deals: ds, totals: totals(ds) };
  });
  return { columns, totals: totals(deals) };
}

const names = (p: Pipeline, stage: Stage) => p.columns.find((c) => c.stage === stage)!.deals.map((d) => d.id);
const column = (p: Pipeline, stage: Stage) => p.columns.find((c) => c.stage === stage)!;

// New: 1, 2, 3; Qualified: 4
const start = () => board([deal(1, "new", 1), deal(2, "new", 2), deal(3, "new", 3), deal(4, "qualified", 1, 200_000)]);

describe("applyMove", () => {
  test("within a column", () => {
    const next = applyMove(start(), 3, "new", 1, TODAY);
    expect(names(next, "new")).toEqual([1, 3, 2]);
    expect(column(next, "new").deals[1].position).toBe(1.5);
    expect(next.totals).toEqual(start().totals);
  });

  test("to another column changes the stage, probability and totals straight away", () => {
    const next = applyMove(start(), 2, "qualified", 0, TODAY);
    expect(names(next, "new")).toEqual([1, 3]);
    expect(names(next, "qualified")).toEqual([2, 4]);
    const moved = column(next, "qualified").deals[0];
    expect(moved.probability).toBe(25);
    expect(column(next, "new").totals).toEqual({ value_pence: 200_000, expected_pence: 20_000, count: 2 });
    expect(column(next, "qualified").totals).toEqual({ value_pence: 300_000, expected_pence: 75_000, count: 2 });
    expect(next.totals).toEqual({ value_pence: 500_000, expected_pence: 95_000, count: 4 });
  });

  test("to Won closes it today and takes it out of the totals", () => {
    const next = applyMove(start(), 1, "won", 0, TODAY);
    const won = column(next, "won");
    expect(won.deals[0].close_date).toBe(TODAY);
    expect(won.deals[0].probability).toBe(100);
    expect(won.totals).toEqual({ value_pence: null, expected_pence: null, count: 1 });
    expect(next.totals.count).toBe(3);
  });

  test("a late deal moved to Lost is no longer late", () => {
    const late = board([{ ...deal(1, "new", 1, 100_000, "2026-11-01"), is_late: true }]);
    expect(column(applyMove(late, 1, "lost", 0, TODAY), "lost").deals[0].is_late).toBe(false);
  });

  test("neighbours ignore the moved card", () => {
    expect(neighbours(start(), 3, "new", 1)).toEqual({ before_id: 1, after_id: 2 });
    expect(neighbours(start(), 1, "new", 2)).toEqual({ before_id: 3, after_id: null });
    expect(neighbours(start(), 1, "proposal", 0)).toEqual({ before_id: null, after_id: null });
  });
});

describe("useMoveDeal", () => {
  afterEach(() => vi.unstubAllGlobals());

  function setup() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(PIPELINE_KEY, start());
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useMoveDeal(), { wrapper });
    return { client, move: result.current };
  }

  test("updates the board before the server answers", async () => {
    let answer: (r: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => (answer = resolve))));
    const { client, move } = setup();
    act(() => move(2, "qualified", 0));
    const now = client.getQueryData<Pipeline>(PIPELINE_KEY)!;
    expect(names(now, "qualified")).toEqual([2, 4]);
    expect(now.totals.expected_pence).toBe(95_000);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/deals/2/move", expect.objectContaining({ method: "POST", body: JSON.stringify({ stage: "qualified", before_id: null, after_id: 4 }) })));
    answer(new Response(JSON.stringify({ errors: {} }), { status: 500 }));
  });

  test("a rejected move puts the board back", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ errors: { before_id: "That card isn't in this column" } }), { status: 422 })));
    const { client, move } = setup();
    act(() => move(2, "qualified", 0));
    expect(names(client.getQueryData<Pipeline>(PIPELINE_KEY)!, "qualified")).toEqual([2, 4]);
    await waitFor(() => expect(names(client.getQueryData<Pipeline>(PIPELINE_KEY)!, "qualified")).toEqual([4]));
    expect(client.getQueryData<Pipeline>(PIPELINE_KEY)).toEqual(start());
  });
});
