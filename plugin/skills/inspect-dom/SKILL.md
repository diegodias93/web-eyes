---
name: inspect-dom
description: Captures the full HTML/DOM of the focused Chrome tab to inspect the structure — elements, attributes, classes. Invoke when the user wants to understand the page structure, not just the content.
---

# Inspect DOM

Captures the HTML of the focused Chrome tab for structural analysis.

Steps:
1. Call the MCP tool `capture_dom` (from the `dd-web-eyes-mcp` server).
2. If Chrome isn't running on the debug port, the server launches it automatically — no manual step needed. If it still fails, report the error to the user.
3. The DOM can be large — focus on the part relevant to the user's question (a selector, a section) instead of dumping everything.

Use this skill for HTML structure. To just read text use `/look-tab`; for visuals use `/tab-screenshot`.
