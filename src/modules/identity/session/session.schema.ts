import { z } from "zod";

export const revokeSessionParamsSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, "Session id is required"),
  }),
});

export type RevokeSessionParamsDto = z.infer<
  typeof revokeSessionParamsSchema
>["params"];
