#!/usr/bin/env bun
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const COMPOSE_FILE = path.join(ROOT, "docker-compose.yml");

function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn("docker", ["compose", "-f", COMPOSE_FILE, ...args], {
      stdio: "inherit",
      cwd: ROOT,
    });
    p.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`docker compose ${args.join(" ")} exited ${code}`)),
    );
  });
}

async function waitReady() {
  const targets = [
    { url: "http://localhost:6300/health", name: "proof-server" },
    {
      url: "http://localhost:8088/api/v4/graphql",
      name: "indexer",
      method: "POST",
      body: '{"query":"{__typename}"}',
    },
  ];
  const started = Date.now();
  for (;;) {
    let allOk = true;
    for (const t of targets) {
      try {
        const res = await fetch(t.url, {
          method: t.method ?? "GET",
          headers: t.body ? { "content-type": "application/json" } : undefined,
          body: t.body,
        });
        if (!res.ok) allOk = false;
      } catch {
        allOk = false;
      }
    }
    if (allOk) {
      console.log("✓ proof-server + indexer are ready");
      return;
    }
    if (Date.now() - started > 180_000) {
      console.error("Timed out waiting for services. Check `docker compose ps` and logs.");
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

if (!fs.existsSync(COMPOSE_FILE)) {
  console.error("Missing docker-compose.yml");
  process.exit(1);
}

const cmd = process.argv[2];
if (cmd === "up") {
  await run(["up", "-d"]);
  await waitReady();
} else if (cmd === "down") {
  await run(["down", "-v"]);
} else if (cmd === "status") {
  await run(["ps"]);
} else {
  console.log("Usage: bun scripts/midnight-standalone.mjs <up|down|status>");
  process.exit(1);
}
