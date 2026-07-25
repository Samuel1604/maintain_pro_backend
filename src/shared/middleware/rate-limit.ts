import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please check your credentials and try again later."
});

export const otpRateLimit =
  rateLimit({
    windowMs:
      10 * 60 * 1000,

    max: 3,

    message:
      "Too many OTP requests. Please try again later.",
  });

