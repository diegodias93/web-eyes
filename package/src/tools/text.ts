import { createRequire } from "node:module";
import { withActivePage } from "../browser.js";

const require = createRequire(import.meta.url);
// Standalone Readability script (Firefox's reader mode engine). Injected into the
// page so it parses the live DOM — no jsdom needed.
const READABILITY_PATH = require.resolve("@mozilla/readability/Readability.js");

export const textTool = {
  name: "capture_text",
  description:
    "Extracts the readable text of the focused Chrome tab (main content, no menus/footer). " +
    "Use to read documentation, articles or any textual content — it's the cheapest mode in tokens.",
  inputSchema: {
    type: "object" as const,
    properties: {},
  },
};

export async function runText() {
  return withActivePage(async (page) => {
    const url = page.url();
    const title = await page.title();

    // Inject Readability so it can run against the live DOM. Some pages block
    // <script> injection (Trusted Types / strict CSP, e.g. chrome:// pages) — if
    // so we just skip it and fall back to innerText below.
    await page.addScriptTag({ path: READABILITY_PATH }).catch(() => {});

    const { text, links } = await page.evaluate(() => {
      // Readability is a global injected by addScriptTag; may be absent if the page
      // blocked it (Trusted Types / CSP). Wrapped in try so it can never throw.
      const Readability = (window as any).Readability;
      let article: { textContent?: string; content?: string } | null = null;
      try {
        if (Readability) article = new Readability(document.cloneNode(true)).parse();
      } catch {
        article = null;
      }

      // Main content: Readability's clean text, or fall back to body text if the
      // page isn't an article (dashboards, apps) or blocked the script.
      const text = (article?.textContent || document.body?.innerText || "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      // Links from the MAIN CONTENT when available (else the live anchors). Parse
      // the article HTML with DOMParser, NOT innerHTML — innerHTML trips Trusted
      // Types on strict pages. Skip empty/anchor/js links, de-dupe.
      const anchors = article?.content
        ? new DOMParser().parseFromString(article.content, "text/html").querySelectorAll("a[href]")
        : document.querySelectorAll("a[href]");
      const seen = new Set<string>();
      const links: Array<{ text: string; href: string }> = [];
      anchors.forEach((a) => {
        const href = (a as HTMLAnchorElement).href;
        const label = (a.textContent || "").trim();
        if (!label || !href || href.startsWith("javascript:") || href.startsWith("#")) return;
        if (seen.has(href)) return;
        seen.add(href);
        links.push({ text: label, href });
      });

      return { text, links };
    });

    let out = `URL: ${url}\nTitle: ${title}\n\n${text}`;
    if (links.length > 0) {
      const list = links.map((l) => `- ${l.text} → ${l.href}`).join("\n");
      out += `\n\n--- Links ---\n${list}`;
    }

    return {
      content: [{ type: "text" as const, text: out }],
    };
  });
}
