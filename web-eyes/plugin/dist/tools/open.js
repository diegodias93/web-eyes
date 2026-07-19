import { ensureChrome } from "../browser.js";
export const openTool = {
    name: "open_chrome",
    description: "Opens the debug Chrome window (without capturing anything), so the user can log in " +
        "and navigate before using the capture tools. Use when the user wants to prepare the browser first.",
    inputSchema: {
        type: "object",
        properties: {},
    },
};
export async function runOpen() {
    const launched = await ensureChrome();
    const msg = launched
        ? "Debug Chrome opened. Log in and navigate to the page you want, then use /look-text, /look-image or /look-dom."
        : "Debug Chrome is already running. Navigate to the page you want, then use /look-text, /look-image or /look-dom.";
    return {
        content: [{ type: "text", text: msg }],
    };
}
