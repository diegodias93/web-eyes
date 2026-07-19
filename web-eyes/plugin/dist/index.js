#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { screenshotTool, runScreenshot, fullScreenshotTool, runFullScreenshot } from "./tools/screenshot.js";
import { textTool, runText } from "./tools/text.js";
import { domTool, runDom } from "./tools/dom.js";
import { openTool, runOpen } from "./tools/open.js";
import { openUrlTool, runOpenUrl } from "./tools/navigate.js";
import { watchTool, runWatch } from "./tools/watch.js";
const tools = [openTool, openUrlTool, textTool, screenshotTool, fullScreenshotTool, domTool, watchTool];
const handlers = {
    [openTool.name]: runOpen,
    [openUrlTool.name]: runOpenUrl,
    [textTool.name]: runText,
    [screenshotTool.name]: runScreenshot,
    [fullScreenshotTool.name]: runFullScreenshot,
    [domTool.name]: runDom,
};
const server = new Server({
    name: "web-eyes",
    version: "1.1.0",
}, {
    capabilities: {
        tools: {},
    },
});
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const name = request.params.name;
    try {
        // watch blocks until the user clicks; it emits progress while waiting so the
        // client's idle timeout never fires (see Brain: timeout de tool MCP).
        if (name === watchTool.name) {
            const token = request.params._meta?.progressToken;
            const heartbeat = () => {
                if (token !== undefined) {
                    extra.sendNotification({
                        method: "notifications/progress",
                        params: { progressToken: token, progress: 0, message: "listening…" },
                    }).catch(() => { });
                }
            };
            return await runWatch(heartbeat, extra.signal);
        }
        const handler = handlers[name];
        if (!handler) {
            return {
                content: [{ type: "text", text: `Unknown tool: ${name}` }],
                isError: true,
            };
        }
        return await handler(request.params.arguments);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
            content: [{ type: "text", text: msg }],
            isError: true,
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    console.error("[web-eyes] fatal error:", err);
    process.exit(1);
});
