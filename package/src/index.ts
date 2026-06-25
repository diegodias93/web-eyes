#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { screenshotTool, runScreenshot } from "./tools/screenshot.js";
import { textTool, runText } from "./tools/text.js";
import { domTool, runDom } from "./tools/dom.js";

const tools = [screenshotTool, textTool, domTool];

const handlers: Record<string, () => Promise<any>> = {
  [screenshotTool.name]: runScreenshot,
  [textTool.name]: runText,
  [domTool.name]: runDom,
};

const server = new Server(
  {
    name: "dd-web-eyes-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const handler = handlers[request.params.name];
  if (!handler) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }],
      isError: true,
    };
  }
  try {
    return await handler();
  } catch (err) {
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
  console.error("[dd-web-eyes-mcp] fatal error:", err);
  process.exit(1);
});
