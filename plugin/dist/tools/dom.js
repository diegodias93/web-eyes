import { withActivePage } from "../browser.js";
export const domTool = {
    name: "capture_dom",
    description: "Captures the full HTML (DOM) of the focused Chrome tab. " +
        "Use to inspect the page structure — elements, attributes, classes.",
    inputSchema: {
        type: "object",
        properties: {},
    },
};
export async function runDom() {
    return withActivePage(async (page) => {
        const url = page.url();
        const html = await page.content();
        return {
            content: [
                {
                    type: "text",
                    text: `URL: ${url}\n\n${html}`,
                },
            ],
        };
    });
}
