import { z } from "zod";

export const organizationSchema = z.object({
  name: z.string().trim().min(1, "Required").max(200, "Keep it to 200 characters or fewer"),
  website: z.string().trim(),
  industry: z.string().trim(),
  notes: z.string().trim(),
});

export type OrganizationValues = z.infer<typeof organizationSchema>;
