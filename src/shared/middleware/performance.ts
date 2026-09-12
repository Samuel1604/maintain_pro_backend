import type { Request, Response, NextFunction } from "express";

export function performanceMetrics(req: Request, res: Response, next: NextFunction) {
  const started = process.hrtime.bigint();
  res.on("finish", () => {
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;
    // finish fires after headers are sent, so log the measurement rather than
    // attempting to mutate the response headers too late.
    if (process.env.PERFORMANCE_LOG === "true") console.debug(`[perf] ${req.method} ${req.originalUrl} ${elapsedMs.toFixed(2)}ms`);
  });
  next();
}
