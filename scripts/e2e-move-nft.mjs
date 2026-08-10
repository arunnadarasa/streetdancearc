#!/usr/bin/env bun
/**
 * Mint → list → buy on Undeployed MoveNft + mUSDC.
 * Prefers scripts/z-check.mjs (stable name). Requires a fresh deploy when
 * Compact artefacts change: bun run midnight:compile && midnight:artefacts && midnight:deploy
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const child = spawn("bun", ["scripts/z-check.mjs"], {
  cwd: ROOT,
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code) => process.exit(code ?? 1));
