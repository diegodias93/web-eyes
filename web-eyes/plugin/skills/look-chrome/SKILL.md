---
name: look-chrome
description: Opens the debug Chrome window so the user can log in and navigate before capturing. Invoke when the user wants to prepare the browser first, says "open chrome", "start the browser" or similar.
---

# Look — open Chrome

Opens the dedicated debug Chrome (without capturing anything), so the user can log in and navigate to the right page before using the capture commands.

Steps:
1. Call the MCP tool `open_chrome` (from the `web-eyes` server).
2. Relay the result to the user — Chrome is now ready for them to log in / navigate.

After the user is on the page they want, use `/look-text` (read), `/look-image` (screenshot) or `/look-dom` (HTML).
