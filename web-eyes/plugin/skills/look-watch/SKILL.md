---
name: look-watch
description: Enters hands-free listen mode — shows clickable buttons (text, image, full, dom, stop) in the Chrome tabs, and each click captures that mode automatically. Invoke when the user says "watch mode", "listen mode", "show the buttons", "let me click to capture" or similar.
---

# Look — watch mode

Hands-free mode: the user drives from the browser — clicking buttons to capture,
or typing in the overlay's message box to talk to you. You keep listening in a
loop until they click **stop**.

How the loop works:
1. Call the MCP tool `watch`. It shows a message box + 5 buttons (text, image, full, dom, stop) in every Chrome tab and BLOCKS until the user clicks a button or sends a message, then returns the result.
2. Read the first line of the result:
   - **`WATCH_CLICK: <mode>`** — the rest of the result is the capture (text / image / full-page image / dom) for the tab the user clicked. Briefly acknowledge or summarize what you see (one or two lines — don't over-explain unless asked). It may be preceded by a **`WATCH_MSG: <text>`** line — that's a message the user typed alongside the capture; answer it while commenting on what you see.
   - **`WATCH_MSG: <text>`** — the user typed a message in the overlay. Reply to it normally (no capture happened — answer from what you've already seen / the context). This is how they talk to you without leaving listen mode.
   - **`WATCH_STOPPED`** — the user clicked stop. Tell them watch mode ended and **do NOT call `watch` again**.
3. If it was a `WATCH_CLICK` or a `WATCH_MSG`, **call `watch` again immediately** to keep listening. This is the loop — the user only ran `/look-watch` once and expects it to stay active.

Important:
- Do not ask the user "should I keep listening?" between events — just re-arm `watch` silently after each capture or reply.
- The user can still press Esc anytime to interrupt; when they hand control back, resume by calling `watch`. But for a quick question, the overlay message box keeps the loop alive — no Esc needed.
- Only stop the loop on `WATCH_STOPPED` or if the user explicitly says to stop.
