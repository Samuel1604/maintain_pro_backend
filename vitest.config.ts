import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    pool: "forks",
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    setupFiles: ["src/tests/vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.spec.ts", "tests/**/*.test.ts", "tests/**/*.spec.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
