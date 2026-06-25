import { getActivePage } from "../browser.js";

export const textTool = {
  name: "capture_text",
  description:
    "Extracts the visible text of the focused Chrome tab. " +
    "Use to read documentation, articles or any textual content — it's the cheapest mode in tokens.",
  inputSchema: {
    type: "object" as const,
    properties: {},
  },
};

export async function runText() {
  const page = await getActivePage();
  const url = page.url();
  const title = await page.title();
  const text = await page.innerText("body");
  return {
    content: [
      {
        type: "text" as const,
        text: `URL: ${url}\nTitle: ${title}\n\n${text}`,
      },
    ],
  };
}
