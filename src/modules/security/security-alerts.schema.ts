import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid alert id");

export const alertIdParamsSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export type AlertIdParamsDto = z.infer<typeof alertIdParamsSchema>["params"];
