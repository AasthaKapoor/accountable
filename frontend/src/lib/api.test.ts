import { afterEach, describe, expect, test, vi } from "vitest";
import { api, ApiError, BlockedError, ValidationError, withQuery } from "./api";

function respond(status: number, body?: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("api", () => {
  test("returns JSON on success", async () => {
    respond(200, { id: 1 });
    await expect(api.get("/deals/1")).resolves.toEqual({ id: 1 });
  });

  test("422 becomes a ValidationError with the field messages", async () => {
    respond(422, { errors: { name: "Required" } });
    const error: any = await api.post("/deals", {}).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.errors).toEqual({ name: "Required" });
  });

  test("409 becomes a BlockedError", async () => {
    respond(409, { message: "Acme can't be deleted", blocking: [{ type: "deal", id: 2, name: "Big" }] });
    const error: any = await api.delete("/organizations/1").catch((e) => e);
    expect(error).toBeInstanceOf(BlockedError);
    expect(error.message).toBe("Acme can't be deleted");
    expect(error.blocking).toHaveLength(1);
  });

  test("other errors keep the server's message", async () => {
    respond(404, { message: "Deal not found" });
    const error: any = await api.get("/deals/9").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.message).toBe("Deal not found");
  });

  test("204 resolves to nothing", async () => {
    respond(204);
    await expect(api.delete("/deals/1")).resolves.toBeUndefined();
  });
});

test("withQuery leaves out empty values", () => {
  expect(withQuery("/contacts", { search: "", status: "lead", page: 2, sort: undefined })).toBe("/contacts?status=lead&page=2");
  expect(withQuery("/contacts")).toBe("/contacts");
});
