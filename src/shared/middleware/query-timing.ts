import type { Request, Response, NextFunction } from "express";

export function queryTiming(req: Request, res: Response, next: NextFunction) {
  const started = process.hrtime.bigint();
  res.on("finish", () => {
    if (process.env.PERFORMANCE_LOG === "true") {
      const elapsed = Number(process.hrtime.bigint() - started) / 1_000_000;
      console.debug(`[perf] ${req.method} ${req.originalUrl} ${elapsed.toFixed(2)}ms status=${res.statusCode}`);
    }
  });
  next();
}
