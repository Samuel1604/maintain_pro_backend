/**
 * MongoDB/Mongoose duplicate-key errors (violating a `unique` index) surface
 * as a driver-level error with `code === 11000` — not as one of our own
 * AppError subclasses. Anywhere an insert/update can race against another
 * write to the same unique field, catch and check this before deciding
 * whether to translate the failure into a safe, user-facing error or a
 * compensating rollback, rather than letting the raw driver error escape to
 * the generic error handler.
 */
export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}
