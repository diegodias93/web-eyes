---
name: look-full
description: Takes a full-page screenshot of the focused Chrome tab — the entire scrollable page, not just the visible viewport — and analyzes it visually. Invoke when the whole page matters, or the user asks for a "full screenshot", "whole page", "entire page".
---

# Look at full page

Captures the focused Chrome tab as a single image of the whole scrollable page (not just what's on screen) and analyzes what's visible.

Steps:
1. Call the MCP tool `capture_full_screenshot` (from the `web-eyes` server).
2. If Chrome isn't running on the debug port, the server launches it automatically — no manual step needed. If it still fails, report the error to the user.
3. Analyze the image and answer the user's question, or describe what you see.

Use this when the whole page matters. For just the visible viewport (cheaper on tall pages) use `/look-image`; to read text use `/look-text`; for HTML structure use `/look-dom`.
