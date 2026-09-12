import { spawn, type ChildProcess } from "node:child_process";
import { env } from "@/config/env.js";

/** Manages an optional development/public ingress tunnel alongside the API. */
export class TunnelService {
  private process?: ChildProcess;

  start(port: number): void {
    if (!env.TUNNEL_AUTOSTART || env.TUNNEL_PROVIDER === "none") return;
    const targetPort = env.TUNNEL_PORT ?? port;
    const command = env.TUNNEL_PROVIDER === "ngrok" ? "ngrok" : "cloudflared";
    const args = env.TUNNEL_PROVIDER === "ngrok"
      ? ["http", String(targetPort)]
      : ["tunnel", "--url", `http://127.0.0.1:${targetPort}`];

    this.process = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    });
    this.process.once("error", (error) => {
      console.error(`[tunnel] Unable to start ${env.TUNNEL_PROVIDER}:`, error.message);
    });
    this.process.once("exit", (code, signal) => {
      if (code !== 0 && signal !== "SIGTERM") {
        console.error(`[tunnel] ${env.TUNNEL_PROVIDER} exited with code ${code ?? "unknown"}.`);
      }
      this.process = undefined;
    });
    console.info(`[tunnel] ${env.TUNNEL_PROVIDER} started for API port ${targetPort}.`);
  }

  stop(): void {
    if (!this.process || this.process.killed) return;
    this.process.kill("SIGTERM");
    this.process = undefined;
  }
}
