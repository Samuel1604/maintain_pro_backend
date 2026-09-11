import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('../', import.meta.url).pathname);

const requiredFiles = [
  'dist/server.js',
  'dist/worker.js',
  'Dockerfile',
  'docker-compose.production.yml',
  '.env.production.example',
  'DEPLOYMENT_READINESS.md',
];

const missing = requiredFiles.filter((file) => !existsSync(resolve(root, file)));
if (missing.length > 0) {
  console.error(`Release verification failed: missing ${missing.join(', ')}`);
  process.exit(1);
}

const dockerfile = readFileSync(resolve(root, 'Dockerfile'), 'utf8');
const compose = readFileSync(resolve(root, 'docker-compose.production.yml'), 'utf8');
const envExample = readFileSync(resolve(root, '.env.production.example'), 'utf8');

const assertions = [
  ['Docker image exposes port 8000', /EXPOSE\s+8000\b/.test(dockerfile)],
  ['Docker image runs as non-root', /USER\s+node\b/.test(dockerfile)],
  ['Compose defines API service', /\n\s{2}api:\n/.test(compose)],
  ['Compose defines worker service', /\n\s{2}worker:\n/.test(compose)],
  ['Compose uses API readiness/liveness healthcheck', /health\/live/.test(compose)],
  ['Production queue driver is explicit', /^QUEUE_DRIVER=bullmq$/m.test(envExample)],
  ['Production tunnel is disabled', /^TUNNEL_AUTOSTART=false$/m.test(envExample)],
];

const failed = assertions.filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length > 0) {
  console.error(`Release verification failed: ${failed.join('; ')}`);
  process.exit(1);
}

console.log(`Release verification passed (${requiredFiles.length} artifacts, ${assertions.length} contract checks).`);
