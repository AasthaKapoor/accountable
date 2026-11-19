import { z } from "zod";
import { STAGE_KEYS } from "../../lib/stages";

export interface ContactOption {
  id: number;
  organization_id: number;
}

/** Deal form rules. With `contacts`, the chosen contact must belong to the chosen organization. */
export function dealSchema(contacts?: ContactOption[]) {
  return z
    .object({
      name: z.string().trim().min(1, "Required"),
      organization_id: z.number({ error: "Required" }).int().positive("Required"),
      contact_id: z.number({ error: "Required" }).int().positive("Required"),
      stage: z.enum(STAGE_KEYS as [string, ...string[]], { error: "Required" }),
      value_pounds: z.number({ error: "Required" }).min(0, "Can't be negative").max(1e9, "That's too large"),
      probability: z.number({ error: "Required" }).int("Use a whole number").min(0, "Must be 0 or more").max(100, "Must be 100 or less"),
      close_date: z.string().min(1, "Required"),
    })
    .superRefine((values, ctx) => {
      const contact = contacts?.find((c) => c.id === values.contact_id);
      if (contact && contact.organization_id !== values.organization_id) {
        ctx.addIssue({ code: "custom", path: ["contact_id"], message: "Choose a contact from this organization" });
      }
    });
}

export type DealValues = z.infer<ReturnType<typeof dealSchema>>;
