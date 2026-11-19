import type { Blocking } from "./types";

/** Any failed request. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** 422: one message per field. */
export class ValidationError extends ApiError {
  constructor(readonly errors: Record<string, string>) {
    super(Object.values(errors)[0] ?? "Check the form and try again", 422);
    this.name = "ValidationError";
  }
}

/** 409: a delete blocked by linked records. */
export class BlockedError extends ApiError {
  constructor(
    message: string,
    readonly blocking: Blocking[],
  ) {
    super(message, 409);
    this.name = "BlockedError";
  }
}

type Query = Record<string, string | number | null | undefined>;

export function withQuery(path: string, query: Query = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't reach the server. Is it running?", 0);
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (response.ok) return data as T;
  if (response.status === 422 && data?.errors) throw new ValidationError(data.errors);
  if (response.status === 409 && data?.message) throw new BlockedError(data.message, data.blocking ?? []);
  throw new ApiError(data?.message ?? `Something went wrong (${response.status})`, response.status);
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", withQuery(path, query)),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: (path: string) => request<void>("DELETE", path),
};
