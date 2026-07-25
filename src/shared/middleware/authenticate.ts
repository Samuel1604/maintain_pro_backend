import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authorization header missing",
      });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        message: "Invalid authorization format",
      });
    }

    const decoded = verifyAccessToken(token);

    if (!decoded || typeof decoded === "string") {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };
    return next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};
