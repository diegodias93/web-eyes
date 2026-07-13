import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import type { Page } from "playwright-core";

const require = createRequire(import.meta.url);
// Legacy build runs in plain Node (no worker, no canvas) — we only pull text out,
// never render, so this stays light. Resolved so it works wherever npx installs it,
// then turned into a file:// URL because dynamic import() rejects raw Windows paths.
const PDFJS_URL = pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.mjs")).href;

/** True if the focused tab is Chrome's built-in PDF viewer. */
export async function isPdfPage(page: Page): Promise<boolean> {
  // Chrome serves PDFs with contentType application/pdf; the PDFium viewer keeps
  // the text out of the DOM (innerText is empty), so this is the reliable signal.
  return page
    .evaluate(() => document.contentType === "application/pdf")
    .catch(() => false);
}

/**
 * Pulls the text out of the PDF open in `page`. Fetches the bytes THROUGH the tab
 * (page.request reuses its cookies/session, so PDFs behind a login work), then
 * extracts text page by page with pdf.js. Returns the joined text and the page
 * count. Text is empty for scanned/image-only PDFs (no text layer) — the caller
 * handles that.
 */
export async function extractPdf(page: Page): Promise<{ text: string; pages: number }> {
  const resp = await page.request.get(page.url());
  const body = await resp.body();

  const pdfjs = await import(PDFJS_URL);
  // pdf.js logs font quirks ("TT: undefined function") to console; mute them so
  // they don't leak into the MCP output. disableWorker → runs inline in Node.
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(body),
    disableWorker: true,
    verbosity: 0,
  }).promise;

  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i);
    const content = await p.getTextContent();
    const line = content.items
      .map((it: { str?: string }) => it.str ?? "")
      .join(" ")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
    if (line) parts.push(line);
  }

  return { text: parts.join("\n\n").trim(), pages: doc.numPages };
}
