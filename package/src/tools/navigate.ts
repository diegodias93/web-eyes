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

export async function runOpenUrl(args: { url?: string }) {
  const raw = (args?.url || "").trim();
  if (!raw) {
    return {
      content: [{ type: "text" as const, text: "No URL provided." }],
      isError: true,
    };
  }
  // Bare hosts ("localhost:3000", "example.com") get http:// so goto doesn't
  // treat them as a file path or a search.
  const url = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`;

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
