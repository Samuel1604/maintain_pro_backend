import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const distRoot = fileURLToPath(new URL("../dist/", import.meta.url));
const unresolvedAliases = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
      continue;
    }
    if (!entry.name.endsWith(".js")) continue;
    const source = await readFile(path, "utf8");
    if (source.includes('from "@/') || source.includes("from '@/")) {
      unresolvedAliases.push(path);
    }
  }
}

await visit(distRoot);

if (unresolvedAliases.length > 0) {
  console.error("Build contains unresolved @/ aliases:");
  for (const path of unresolvedAliases) console.error(`- ${path}`);
  process.exit(1);
}

console.log("Compiled import check passed.");
