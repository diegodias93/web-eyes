import { createRequire } from "node:module";
import { withActivePage } from "../browser.js";
import { isPdfPage, extractPdf } from "./pdf.js";
const require = createRequire(import.meta.url);
// Standalone Readability script (Firefox's reader mode engine). Injected into the
// page so it parses the live DOM — no jsdom needed.
const READABILITY_PATH = require.resolve("@mozilla/readability/Readability.js");
export const textTool = {
    name: "capture_text",
    description: "Extracts the readable text of the focused Chrome tab (main content, no menus/footer). " +
        "Also reads PDFs open in the tab — extracts their text automatically. " +
        "Use to read documentation, articles or any textual content — it's the cheapest mode in tokens.",
    inputSchema: {
        type: "object",
        properties: {},
    },
};
export async function runText(target) {
    return withActivePage(async (page) => {
        const url = page.url();
        const title = await page.title();
        // PDF tab: Chrome's viewer keeps the text out of the DOM, so Readability below
        // would return nothing. Extract it from the PDF bytes instead (see pdf.ts;
        // Brain: captura-pdf via pdfjs / page.request).
        if (await isPdfPage(page)) {
            const { text, pages } = await extractPdf(page);
            const body = text
                ? text
                : "(This PDF has no extractable text — it's likely a scanned/image-only " +
                    "document. Use /look-image to view it as a screenshot instead.)";
            return {
                content: [
                    { type: "text", text: `URL: ${url}\nTitle: ${title}\nPages: ${pages}\n\n${body}` },
                ],
            };
        }
        // Inject Readability so it can run against the live DOM. Some pages block
        // <script> injection (Trusted Types / strict CSP, e.g. chrome:// pages) — if
        // so we just skip it and fall back to innerText below.
        await page.addScriptTag({ path: READABILITY_PATH }).catch(() => { });
        const { text, links } = await page.evaluate(() => {
            // Readability is a global injected by addScriptTag; may be absent if the page
            // blocked it (Trusted Types / CSP). Wrapped in try so it can never throw.
            const Readability = window.Readability;
            let article = null;
            try {
                if (Readability)
                    article = new Readability(document.cloneNode(true)).parse();
            }
            catch {
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
            const seen = new Set();
            const links = [];
            anchors.forEach((a) => {
                const href = a.href;
                const label = (a.textContent || "").trim();
                if (!label || !href || href.startsWith("javascript:") || href.startsWith("#"))
                    return;
                if (seen.has(href))
                    return;
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
            content: [{ type: "text", text: out }],
        };
    }, target);
}
