---
name: look-go
description: Opens a URL in a new Chrome tab so Claude can then look at it. Invoke when Claude needs to see a page on its own initiative — a local dev server (localhost:3000), a link from the chat, or when the user says "open this URL", "go to", "navigate to".
---

# Look — go to a URL

Opens a URL in a NEW Chrome tab (it never touches the tab the user is on) and brings it to focus, so the capture commands can then look at it. This is how Claude reaches a page on its own — e.g. to check a local dev server it just started.

Steps:
1. Call the MCP tool `open_url` (from the `web-eyes` server) with the `url` (a bare host like `localhost:3000` is fine — it's prefixed with `http://`).
2. If Chrome isn't running on the debug port, the server launches it automatically — no manual step needed. If it fails, report the error to the user.
3. The new tab is now focused. Use `/look-image`, `/look-full`, `/look-text` or `/look-dom` to look at it.
