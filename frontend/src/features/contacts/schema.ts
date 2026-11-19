import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  email: z.union([z.literal(""), z.email("Enter a valid email address")]),
  phone: z.string().trim(),
  job_title: z.string().trim(),
  organization_id: z.number({ error: "Required" }).int().positive("Required"),
  status: z.enum(["lead", "qualified", "customer"], { error: "Required" }),
});

export type ContactValues = z.infer<typeof contactSchema>;
