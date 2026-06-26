---
name: look-watch
description: Enters hands-free listen mode — shows clickable buttons (text, image, dom, stop) in the Chrome tabs, and each click captures that mode automatically. Invoke when the user says "watch mode", "listen mode", "show the buttons", "let me click to capture" or similar.
---

# Look — watch mode

Hands-free mode: the user clicks buttons in the browser instead of typing commands.
You keep listening in a loop until they click **stop**.

How the loop works:
1. Call the MCP tool `watch`. It shows 4 buttons in every Chrome tab and BLOCKS until the user clicks one, then returns the result.
2. Read the first line of the result:
   - **`WATCH_CLICK: <mode>`** — the rest of the result is the capture (text / image / dom) for the tab the user clicked. Briefly acknowledge or summarize what you see (one or two lines — don't over-explain unless asked).
   - **`WATCH_STOPPED`** — the user clicked stop. Tell them watch mode ended and **do NOT call `watch` again**.
3. If it was a `WATCH_CLICK`, **call `watch` again immediately** to keep listening. This is the loop — the user only ran `/look-watch` once and expects it to stay active.

Important:
- Do not ask the user "should I keep listening?" between clicks — just re-arm `watch` silently after each capture.
- The user can interrupt at any time (Esc) to discuss something in depth; when they hand control back, resume by calling `watch`.
- Only stop the loop on `WATCH_STOPPED` or if the user explicitly says to stop.
