import type { ZodIssue } from "zod";
import type { ValidationIssue } from "./validation-issue.js";

export const adaptZodIssues = (issues: ZodIssue[]): ValidationIssue[] => {
  return issues.map((issue) => {
    let field = issue.path.join(".");

    // Strip body/params/query prefix if present
    if (field.startsWith("body.")) {
      field = field.slice(5);
    } else if (field.startsWith("params.")) {
      field = field.slice(7);
    } else if (field.startsWith("query.")) {
      field = field.slice(6);
    } else if (field === "body" || field === "params" || field === "query") {
      field = "";
    }

    return {
      field,
      message: issue.message,
    };
  });
};
