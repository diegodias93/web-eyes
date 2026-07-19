import { connectBrowser } from "../browser.js";

export const openUrlTool = {
  name: "open_url",
  description:
    "Opens a URL in a NEW Chrome tab (never touches the tab the user is on) and brings it to focus, " +
    "so the capture tools can then look at it. Use when Claude needs to see a page on its own " +
    "initiative — e.g. a local dev server (localhost:3000) or a link mentioned in the chat.",
  inputSchema: {
    type: "object" as const,
    properties: {
      url: {
        type: "string" as const,
        description: "The URL to open (http/https). A bare host like 'localhost:3000' is prefixed with http://.",
      },
    },
    required: ["url"],
  },
};

/**
 * Parses a user-supplied URL, returning it only if it's http/https — otherwise
 * null. A bare host gets http:// before parsing; a string that already has a
 * scheme keeps it, so a non-http scheme is rejected instead of being disguised.
 */
export function parseHttpUrl(raw: string): string | null {
  // "scheme://" — the "//" matters: without it, "localhost:3000" would parse as
  // scheme "localhost:" and get rejected as non-http. Schemes that legitimately
  // omit the slashes (data:, javascript:) are the ones we reject anyway, so
  // treating them as a bare host is harmless — they fail the http check below
  // once prefixed (e.g. "http://data:text/html,…" has no valid host).
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
  try {
    const parsed = new URL(hasScheme ? raw : `http://${raw}`);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

export async function runOpenUrl(args: { url?: string }) {
  const raw = (args?.url || "").trim();
  if (!raw) {
    return {
      content: [{ type: "text" as const, text: "No URL provided." }],
      isError: true,
    };
  }
  // Bare hosts ("localhost:3000", "example.com") get http:// so goto doesn't
  // treat them as a file path or a search. Anything that already carries a scheme
  // is parsed as-is and must turn out to be http/https: file://, chrome:// and
  // data: would let a capture reach local files, so they're rejected here rather
  // than handed to page.goto.
  const url = parseHttpUrl(raw);
  if (!url) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Refused to open "${raw}": only http:// and https:// URLs are allowed.`,
        },
      ],
      isError: true,
    };
  }

  // Own CDP connection, closed on the way out — close() only DISCONNECTS, it
  // never closes the user's Chrome or the tab we just opened (see browser.ts).
  const browser = await connectBrowser();
  try {
    const page = await browser.contexts()[0].newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.bringToFront();
    const title = await page.title();
    return {
      content: [
        { type: "text" as const, text: `Opened in a new tab.\nURL: ${page.url()}\nTitle: ${title}` },
      ],
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
