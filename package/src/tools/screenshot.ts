import { withActivePage } from "../browser.js";

export const screenshotTool = {
  name: "capture_screenshot",
  description:
    "Takes a screenshot of the focused Chrome tab and returns it as an image. " +
    "Use when the page layout/visuals matter, or when the content is rendered by JS.",
  inputSchema: {
    type: "object" as const,
    properties: {},
  },
};

export async function runScreenshot() {
  return withActivePage(async (page) => {
    const buffer = await page.screenshot({ type: "png" });
    return {
      content: [
        {
          type: "image" as const,
          data: buffer.toString("base64"),
          mimeType: "image/png",
        },
      ],
    };
  });
}
