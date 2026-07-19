import { withActivePage } from "../browser.js";
export const screenshotTool = {
    name: "capture_screenshot",
    description: "Takes a screenshot of the focused Chrome tab and returns it as an image. " +
        "Use when the page layout/visuals matter, or when the content is rendered by JS.",
    inputSchema: {
        type: "object",
        properties: {},
    },
};
export const fullScreenshotTool = {
    name: "capture_full_screenshot",
    description: "Takes a full-page screenshot of the focused Chrome tab — the entire scrollable page, " +
        "not just the visible viewport — and returns it as an image. " +
        "Use when the whole page matters (long docs, articles); note tall pages produce large images.",
    inputSchema: {
        type: "object",
        properties: {},
    },
};
export function runScreenshot(target) {
    return capture(false, target);
}
export function runFullScreenshot(target) {
    return capture(true, target);
}
function capture(fullPage, target) {
    return withActivePage(async (page) => {
        const buffer = await page.screenshot({ type: "png", fullPage });
        return {
            content: [
                {
                    type: "image",
                    data: buffer.toString("base64"),
                    mimeType: "image/png",
                },
            ],
        };
    }, target);
}
