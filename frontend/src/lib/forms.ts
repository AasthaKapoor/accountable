import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ValidationError } from "./api";

/** Optional number from a form control: blank becomes undefined. */
export const asNumber = (value: unknown) => (value === "" || value === null || value === undefined ? undefined : Number(value));

/**
 * Show a server's 422 messages under the matching fields. Returns false when the
 * error wasn't a validation error, so the caller can show a toast instead.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  rename: Record<string, string> = {},
): boolean {
  if (!(error instanceof ValidationError)) return false;
  for (const [field, message] of Object.entries(error.errors)) {
    setError((rename[field] ?? field) as Path<T>, { type: "server", message });
  }
  return true;
}
