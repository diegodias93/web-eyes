---
name: look-tab
description: Reads the text of the focused Chrome tab so you can discuss the content (docs, articles, sites) with the user. Invoke when the user says "look at my tab", "read this page", "check this site" or similar.
---

# Look at tab

Reads the textual content of the focused Chrome tab and uses it as conversation context.

Steps:
1. Call the MCP tool `capture_text` (from the `dd-web-eyes-mcp` server).
2. If Chrome isn't running on the debug port, the server launches it automatically — no manual step needed. If it still fails, report the error to the user.
3. With the text in hand, answer the user's question about the page, or give a short summary of what you see and ask what they want to discuss.

Use this skill to read — it's the cheapest mode in tokens. For layout/visuals use `/tab-screenshot`; for HTML structure use `/inspect-dom`.
