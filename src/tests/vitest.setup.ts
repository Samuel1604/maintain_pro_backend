import path from "node:path";
import { config as loadEnv } from "dotenv";

// Must run before any other import in this file resolves any module that
// transitively imports "@/config/env.js" — Vitest fully executes each
// setupFile before importing the test file itself, so this is the last
// safe place to set env vars ahead of AppContainer et al. dotenv never
// overwrites a variable already present in process.env, so this only
// fills in what an ambient .env (if any) hasn't already set.
loadEnv({ path: path.resolve(process.cwd(), ".env.test") });
process.env.MAIL_PROVIDER = "noop";
// Do not allow a developer's production/shared Redis URL from .env to leak
// into tests. CI can explicitly opt into its disposable Redis service.
if (process.env.TEST_USE_REDIS !== "true") {
  delete process.env.REDIS_URL;
  process.env.REDIS_HOST = "127.0.0.1";
  process.env.REDIS_PORT = "6379";
  process.env.REDIS_DISABLE_CONNECTION = "true";
}

const { beforeAll, beforeEach, afterAll } = await import("vitest");
const { startTestDatabase, clearTestDatabase, stopTestDatabase } = await import("./helpers/database.js");

beforeAll(async () => {
  if (process.env.TEST_SKIP_DATABASE === "true") return;
  await startTestDatabase();
});

beforeEach(async () => {
  if (process.env.TEST_SKIP_DATABASE === "true") return;
  await clearTestDatabase();
});

afterAll(async () => {
  if (process.env.TEST_SKIP_DATABASE === "true") return;
  await stopTestDatabase();
});
