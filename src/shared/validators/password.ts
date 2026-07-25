import { z } from "zod";

export function passwordConfirmation<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  passwordKey: keyof z.infer<typeof schema>,
  confirmKey: keyof z.infer<typeof schema>,
) {
  return schema.refine((data) => data[passwordKey] === data[confirmKey], {
    path: [confirmKey as string],
    message: "Passwords do not match",
  });
}
