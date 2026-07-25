import jwt from "jsonwebtoken";
import { jwtConfig } from "@/config/jwt.config.js";
import type { JwtPayload } from "jsonwebtoken";

export const generateAccessToken = (payload: JwtPayload) => {
  return jwt.sign(payload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiresIn,
  });
};

export const generateRefreshToken = (payload: JwtPayload) => {
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, jwtConfig.accessSecret);
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, jwtConfig.refreshSecret);
};
