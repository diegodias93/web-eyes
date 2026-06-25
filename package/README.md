# dd-web-eyes-mcp

An MCP server that gives Claude Code "eyes" on a tab in your Chrome — **screenshot**, **text** and **DOM** — so you can discuss a site together with Claude (e.g. learning a documentation page like the WhatsApp API). Runs on your Claude Code subscription, no paid API.

## How it works

```
[your Chrome] --port 9222 (CDP)--> [Playwright] --> [this MCP] --stdio--> [Claude Code]
```

The MCP connects to a Chrome instance running with the remote debugging port and exposes three tools:

| Tool                 | What it does            | When to use                       |
| -------------------- | ----------------------- | --------------------------------- |
| `capture_text`       | Visible text of the page | Read docs/articles (cheapest)    |
| `capture_screenshot` | Image of the page        | Layout/visuals, JS-rendered content |
| `capture_dom`        | Full HTML                | Inspect structure                 |

And three trigger skills in Claude Code: `/look-tab`, `/tab-screenshot`, `/inspect-dom`.

## Install

### 1. Build (once)

```bash
cd dd-web-eyes-mcp
npm install
npm run build
```

### 2. Register with Claude Code

```bash
claude mcp add web-eyes -- node "ABSOLUTE/PATH/dd-web-eyes-mcp/dist/index.js"
```

> Once published to npm this becomes: `claude mcp add web-eyes -- npx -y dd-web-eyes-mcp@latest`

Restart your Claude Code session to load it.

## Usage

Just navigate to the page you want to discuss and tell Claude Code:

- "look at my tab" → reads the text
- "take a screenshot of the page" → screenshot
- "show me the HTML structure" → DOM

**Chrome is launched automatically.** If no Chrome is listening on the debug port, the MCP starts one for you (with `--remote-debugging-port=9222` and a dedicated profile at `C:\tmp\chrome-debug`). You don't run anything by hand.

### First-run note: the dedicated profile

The auto-launched Chrome uses a **separate profile**, so it coexists with your everyday Chrome (both can run at once, each with its own logins). On first use this profile is logged out — log in once to whatever accounts you need (e.g. your Meta/WhatsApp dev account) and those logins persist across sessions.

> Only the tabs in this debug Chrome are visible to Claude. Your everyday Chrome (without the flag) stays invisible to it — by design.

## Tabs

Open as many tabs as you want — the MCP captures the tab that's **in focus** (foreground). If the Chrome window is minimized when you capture, it uses the last known tab.

## Requirements

- Node.js LTS
- Google Chrome (default path `C:\Program Files\Google\Chrome\Application\chrome.exe`)
