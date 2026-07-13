#!/usr/bin/env node
// Smoke test for the MCP server: spawns the compiled server over stdio and runs
// the MCP handshake — `initialize` then `tools/list` — asserting the expected
// tools are registered. It deliberately does NOT call `open_chrome` (or any
// capture tool): those need a real Chrome, so the smoke test stays browser-free
// and runnable in CI. It just proves the server boots and speaks the protocol.
//
// Run: `npm test` (from package/) or `node scripts/smoke-mcp.mjs` (from root).
// Exits 0 on success, 1 on any failure.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const serverEntry = join(repoRoot, "package", "dist", "index.js");
const EXPECTED_TOOLS = ["open_chrome", "open_url", "capture_text", "capture_screenshot", "capture_full_screenshot", "capture_dom", "watch"];
const TIMEOUT_MS = 15000;

if (!existsSync(serverEntry)) {
  fail(`server entry not found: ${serverEntry}\n  Run \`npm run build\` in package/ first.`);
}

const server = spawn(process.execPath, [serverEntry], {
  stdio: ["pipe", "pipe", "inherit"],
});

const timer = setTimeout(() => fail(`no response within ${TIMEOUT_MS}ms`), TIMEOUT_MS);

// Pending JSON-RPC requests, keyed by id -> resolver.
const pending = new Map();
let buffer = "";

server.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  // Messages are newline-delimited JSON over stdio.
  let nl;
  while ((nl = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue; // ignore non-JSON noise
    }
    if (msg.id !== undefined && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});

server.on("error", (err) => fail(`failed to spawn server: ${err.message}`));

function send(method, params, id) {
  const req = { jsonrpc: "2.0", id, method, params };
  return new Promise((resolve) => {
    pending.set(id, resolve);
    server.stdin.write(JSON.stringify(req) + "\n");
  });
}

function notify(method, params) {
  server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
}

function fail(msg) {
  clearTimeout(timer);
  console.error(`\n✗ smoke test FAILED: ${msg}`);
  try { server?.kill(); } catch {}
  process.exit(1);
}

function pass(msg) {
  clearTimeout(timer);
  console.log(`\n✓ ${msg}`);
  try { server.kill(); } catch {}
  process.exit(0);
}

(async () => {
  // 1. initialize
  const init = await send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "web-eyes-smoke-test", version: "0.0.0" },
  }, 1);

  if (init.error) fail(`initialize returned an error: ${JSON.stringify(init.error)}`);
  const serverName = init.result?.serverInfo?.name;
  if (serverName !== "web-eyes") fail(`unexpected serverInfo.name: ${serverName}`);
  console.log(`  initialize ok — server "${serverName}" v${init.result?.serverInfo?.version}`);

  // The spec requires the initialized notification before other requests.
  notify("notifications/initialized", {});

  // 2. tools/list
  const list = await send("tools/list", {}, 2);
  if (list.error) fail(`tools/list returned an error: ${JSON.stringify(list.error)}`);

  const names = (list.result?.tools ?? []).map((t) => t.name).sort();
  const expected = [...EXPECTED_TOOLS].sort();
  const missing = expected.filter((n) => !names.includes(n));
  const extra = names.filter((n) => !expected.includes(n));

  if (missing.length) fail(`missing tools: ${missing.join(", ")} (got: ${names.join(", ")})`);
  if (extra.length) fail(`unexpected tools: ${extra.join(", ")}`);

  console.log(`  tools/list ok — ${names.length} tools: ${names.join(", ")}`);
  pass("MCP handshake: initialize -> tools/list");
})().catch((err) => fail(err?.message ?? String(err)));
