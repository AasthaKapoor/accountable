import { afterEach, expect, test, vi } from "vitest";
import { fetchAll } from "./queries";

afterEach(() => vi.unstubAllGlobals());

test("fetchAll keeps fetching pages until it has every item", async () => {
  const all = Array.from({ length: 230 }, (_, i) => ({ id: i + 1 }));
  const fetch = vi.fn(async (url: string) => {
    const params = new URL(url, "http://localhost").searchParams;
    const page = Number(params.get("page"));
    const size = Number(params.get("page_size"));
    const items = all.slice((page - 1) * size, page * size);
    return new Response(JSON.stringify({ items, total: all.length, page, page_size: size }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetch);

  const items = await fetchAll<{ id: number }>("/organizations", { sort: "name" });

  expect(items).toHaveLength(230);
  expect(items.at(-1)).toEqual({ id: 230 });
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(fetch.mock.calls[0][0]).toBe("/api/organizations?sort=name&page=1&page_size=100");
});
