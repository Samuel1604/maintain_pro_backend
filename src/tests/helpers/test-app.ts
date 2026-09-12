import type { AppContainer } from "@/container/app.container.js";
import { AppContainer as RealAppContainer } from "@/container/app.container.js";

export async function startInMemoryMongo() {
  // The Vitest setup owns the shared MongoMemoryServer. Reusing it prevents
  // parallel suites from opening a second URI on the active Mongoose client.
  return process.env.MONGODB_URI;
}

export async function stopInMemoryMongo() {
  // Database lifecycle is owned by vitest.setup.ts for the whole test run.
  // Individual integration suites must not disconnect the shared client.
}

export async function createTestApp(): Promise<{
  container: AppContainer;
  server: import("http").Server;
}> {
  await startInMemoryMongo();
  const container = new RealAppContainer();
  await container.init();
  const app = (await import("../../app.js")).default;
  const server = await container.startServer(0, app);
  return { container: container as unknown as AppContainer, server };
}

export async function teardownTestApp(
  container?: AppContainer,
  server?: import("http").Server,
) {
  try {
    if (container) await container.shutdown();
  } catch {
    // The test teardown should continue even if a resource is already closed.
  }
  try {
    if (server && typeof server.close === "function") server.close();
  } catch {
    // The test teardown should continue even if the server is already closed.
  }
  await stopInMemoryMongo();
}
