---
name: tab-screenshot
description: Takes a screenshot of the focused Chrome tab and analyzes it visually. Invoke when layout/visuals matter, the content is rendered by JS, or the user asks to "take a screenshot", "see how the page looks".
---

# Tab screenshot

Captures the focused Chrome tab as an image and analyzes what's visible.

Steps:
1. Call the MCP tool `capture_screenshot` (from the `dd-web-eyes-mcp` server).
2. If Chrome isn't running on the debug port, the server launches it automatically — no manual step needed. If it still fails, report the error to the user.
3. Analyze the image and answer the user's question, or describe what you see.

Use this skill when visuals matter. To just read text (cheaper) use `/look-tab`.
