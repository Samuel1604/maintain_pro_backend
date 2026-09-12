import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { jwtConfig } from "@/config/jwt.config.js";
import type { JwtPayload } from "jsonwebtoken";

export const generateAccessToken = (payload: JwtPayload) => {
  return jwt.sign({ ...payload, jti: randomUUID() }, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiresIn,
  });
};

export const generateRefreshToken = (payload: JwtPayload) => {
  return jwt.sign({ ...payload, jti: randomUUID() }, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, jwtConfig.accessSecret);
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, jwtConfig.refreshSecret);
};
