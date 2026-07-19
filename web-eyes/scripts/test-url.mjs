#!/usr/bin/env node
// Tests open_url's scheme validation: only http/https may reach page.goto.
// Non-http schemes (file://, chrome://, data:) would let a capture read local
// files, so they must be rejected before the browser ever sees them.
//
// Runs against the COMPILED parser (dist/), same as the smoke test — `npm test`
// builds first via pretest, so this checks the current source.
//
// Run: `npm test` (from package/) or `node scripts/test-url.mjs` (from root).
// Exits 0 on success, 1 on any failure.

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const navigateEntry = join(repoRoot, "package", "dist", "tools", "navigate.js");

if (!existsSync(navigateEntry)) {
  console.error(`\n✗ url test FAILED: not found: ${navigateEntry}\n  Run \`npm run build\` in package/ first.`);
  process.exit(1);
}

const { parseHttpUrl } = await import(pathToFileURL(navigateEntry).href);

// [input, expected] — null means "must be rejected".
const CASES = [
  // Bare hosts get http:// (the documented convenience — localhost must survive
  // the scheme check, since "localhost:" looks like a scheme).
  ["localhost:3000", "http://localhost:3000/"],
  ["127.0.0.1:8080", "http://127.0.0.1:8080/"],
  ["example.com", "http://example.com/"],
  // Explicit http/https pass through.
  ["http://a.com", "http://a.com/"],
  ["https://a.com/x?y=1", "https://a.com/x?y=1"],
  // Everything else is refused — these are the ones that could read local files
  // or run script if they reached page.goto.
  ["file:///C:/Users/x/.ssh/id_rsa", null],
  ["file://localhost/etc/passwd", null],
  ["FILE:///C:/x", null], // scheme check must be case-insensitive
  ["chrome://settings", null],
  ["data:text/html,<h1>x", null],
  ["javascript:alert(1)", null],
  ["ftp://h/f", null],
  ["", null],
  ["not a url", null],
];

let failed = 0;
for (const [input, expected] of CASES) {
  const actual = parseHttpUrl(input);
  if (actual !== expected) {
    console.error(`  ✗ ${JSON.stringify(input)} → ${JSON.stringify(actual)} (expected ${JSON.stringify(expected)})`);
    failed++;
  }
}

if (failed) {
  console.error(`\n✗ url test FAILED: ${failed}/${CASES.length} case(s)`);
  process.exit(1);
}

console.log(`\n✓ open_url scheme validation: ${CASES.length} cases`);
