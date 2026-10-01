import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("./", import.meta.url));
const worker = spawn(process.execPath, [`${directory}worker.js`], {
  env: process.env,
  stdio: "inherit",
});
const api = spawn(process.execPath, [`${directory}server.js`], {
  env: process.env,
  stdio: "inherit",
});

let shuttingDown = false;

function shutdown(signal: NodeJS.Signals, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  worker.kill(signal);
  api.kill(signal);
  setTimeout(() => process.exit(exitCode), 1_000).unref();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => shutdown(signal));
}

worker.once("error", () => shutdown("SIGTERM", 1));
api.once("error", () => shutdown("SIGTERM", 1));
worker.once("exit", (code) => {
  if (!shuttingDown && code !== 0) shutdown("SIGTERM", code ?? 1);
});
api.once("exit", (code) => {
  if (!shuttingDown && code !== 0) shutdown("SIGTERM", code ?? 1);
});
