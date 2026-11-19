import { z } from "zod";

export const activitySchema = z.object({
  type: z.enum(["note", "call", "email"], { error: "Required" }),
  description: z.string().trim().min(1, "Required"),
  /** A datetime-local value, in local time. */
  occurred_at: z.string().min(1, "Required"),
  follow_up_date: z.string(),
});

export type ActivityValues = z.infer<typeof activitySchema>;
