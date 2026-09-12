import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodType } from "zod";
import { ValidationException, adaptZodIssues } from "../errors/index.js";

export const validate =
  <TSchema extends ZodType>(schema: TSchema) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      }) as Request["validated"];

      (req as Request).validated = validated;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = adaptZodIssues(error.issues);
        return next(new ValidationException(issues));
      }

      next(error);
    }
  };
