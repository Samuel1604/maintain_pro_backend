import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDB = async () => {
  try {
    // App containers may be constructed more than once in a process (tests,
    // workers, and CLI commands). Reuse an already-open Mongoose connection.
    if (mongoose.connection.readyState === 1) {
      return;
    }

    // Keep startup and first-request failures bounded. Without explicit
    // limits, Mongoose can wait for the driver's default server-selection
    // window, which makes auth appear hung when MongoDB is starting.
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000,
      connectTimeoutMS: 10_000,
      socketTimeoutMS: 15_000,
    });

    // Import logger lazily to avoid circular module initialization
    // during container construction (tests instantiate AppContainer
    // and importing container/index at module load can cause cycles).
    const { loggerService } = await import("@/container/index.js");
    loggerService.info("MongoDB connected");
  } catch (error) {
    // Avoid exiting the process from deep library code during tests.
    // Log the error and rethrow so callers can decide how to handle it.
    try {
      const { loggerService } = await import("@/container/index.js");
      loggerService.error("MongoDB connection failed", { error });
    } catch {
      // Fallback to console if logger is unavailable.
      console.error("MongoDB connection failed", error);
    }

    throw error;
  }
};
