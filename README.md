# Web Eyes 👁️

**Let Claude Code see the web page you're looking at.**

Normally, Claude Code can read your files and run commands, but it can't see your browser. So when you're reading some documentation, a dashboard, or any website and want Claude's help, you end up copy-pasting text back and forth.

**Web Eyes fixes that.** You open a page in Chrome, say *"look at my tab"*, and Claude instantly sees what's on screen: the text, a screenshot, or the page's HTML. Then you just talk about it together, like you're both looking at the same screen.

A real example: you're learning the **WhatsApp API** from Meta's docs. Instead of copying paragraphs into the chat, you say *"look at my tab"* and ask *"explain how authentication works here"*, and Claude reads the page and answers.

> 💡 It runs on your **Claude Code subscription**. No extra paid API, no API keys.

---

## Commands

You trigger Web Eyes with plain language ("look at my tab") or with the slash commands below. Each one captures the page a different way, for a different purpose.

| Command         | What it does                            | Best for                                                        |
| --------------- | --------------------------------------- | --------------------------------------------------------------- |
| `/look-chrome`  | **Opens** the browser (captures nothing)| Preparing first: log in or navigate before capturing.           |
| `/look-text`    | Claude reads the page's **clean text**  | Reading docs, articles, anything written. Fastest and cheapest. |
| `/look-image`   | Claude sees a **picture** of the page   | Layout, design, charts, or pages that only render with JavaScript. |
| `/look-dom`     | Claude gets the page's **HTML code**    | Understanding the page structure: elements, classes, tags.      |
| `/look-watch`   | **Hands-free mode** with buttons in the tab | Click **Text** / **Image** / **Dom** in the browser to capture; no typing. **Stop** to end. |

You don't have to memorize these. Saying things like *"look at my tab"*, *"take a screenshot of this page"*, or *"show me the HTML"* works too.

> 📖 `/look-text` reads like a reader-mode view: it strips menus, sidebars, footers and cookie banners (powered by Mozilla's Readability) and hands Claude just the main content plus the page's relevant links. Less noise, fewer tokens, better answers.

### Watch mode (`/look-watch`)

Run it once and Web Eyes drops a small toolbar into your Chrome tabs:

```
┌──────┬───────┬─────┬──────┐
│ Text │ Image │ Dom │ Stop │
└──────┴───────┴─────┴──────┘
```

Now you just browse and **click**. Each button captures that tab and hands it to Claude, who reacts. No switching back to type commands. Click **Stop** when you're done. The toolbar follows you across tabs and navigations. (It can't appear on `chrome://` pages, PDFs, or sites with a very strict CSP.)

---

## Privacy & security

Web Eyes is built to stay out of your way and out of your data.

- **Nothing is tracked.** No telemetry, no analytics, no accounts, no servers of ours. Web Eyes never phones home.
- **Everything runs locally.** The bridge between Chrome and Claude lives entirely on your machine (a local debug port on `localhost`). Nothing leaves your computer except the page content you choose to capture, which goes only to your own Claude Code session.
- **Your real browser is untouched.** Web Eyes opens a **separate, isolated Chrome profile** just for this. Your everyday Chrome, with your email and banking logged in, is never opened, read, or exposed.
- **You're in control.** Claude only sees a tab when you ask (or when you click a button in watch mode). It can't browse on its own.
- **Open source.** The whole thing is auditable in this repo. No black box.

The separate profile (a dedicated `web-eyes-chrome-debug` folder under your OS temp directory) also means it coexists with your normal Chrome: both can run at once, each with its own logins. On first use this debug profile is logged out, so log in once to whatever you need (e.g. your Meta developer account) and those logins stick around for next time.

---

## Install

### As a plugin (recommended, adds an on/off switch)

```
/plugin marketplace add diegodias93/web-eyes
/plugin
```

Turn on **web-eyes** in the list, restart Claude Code, and say *"look at my tab"*.

### As an MCP server only (no plugin UI)

Install the package globally once, then point Claude Code at it with `node` directly (not `npx` — see note below):

```
npm install -g @diegodias93/web-eyes
```

macOS/Linux:
```
claude mcp add web-eyes -- node "$(npm root -g)/@diegodias93/web-eyes/dist/index.js"
```

Windows (PowerShell):
```
claude mcp add web-eyes -- node "$(npm root -g)\@diegodias93\web-eyes\dist\index.js"
```

> ⚠️ Why not `npx`? On Windows, Claude Code currently fails to start any MCP server configured with a bare `npx` command (`spawn ENOENT`) — this is a known Claude Code bug ([#58510](https://github.com/anthropics/claude-code/issues/58510)), not something Web Eyes can fix on its own. Calling `node` with the resolved script path sidesteps it entirely, on every OS. To update later, run `npm update -g @diegodias93/web-eyes`.

---

## How it works (the technical bit)

```
[your Chrome] --debug port 9222 (CDP)--> [Playwright] --> [MCP server] --stdio--> [Claude Code]
```

Web Eyes opens a separate Chrome window on its own profile (a `web-eyes-chrome-debug` folder under your OS temp directory, overridable with the `WEB_EYES_PROFILE_DIR` environment variable), with Chrome's debugging port enabled. It connects to that window to read whatever tab you have **in focus** (detected via CDP's most-recently-used target, not the DOM's unreliable `visibilityState`). It launches this Chrome automatically, so you don't run any command by hand.

For text capture, it injects [Mozilla's Readability](https://github.com/mozilla/readability) into the page and runs it on a clone of the DOM, so the live page is never touched. Non-article pages (apps, dashboards) gracefully fall back to the raw body text.

---

## Project layout

```
web-eyes/
├── .claude-plugin/marketplace.json   # the plugin marketplace (root)
├── plugin/                           # the Claude Code plugin (skills + .mcp.json)
└── package/                          # the npm package (@diegodias93/web-eyes)
```

## Requirements

- Node.js LTS, available on your system `PATH`.
- Google Chrome

> ⚠️ Just installed or updated Node? **Fully restart your terminal/editor** (or reboot) before using Web Eyes. Programs that were already running (like VS Code) captured the old `PATH` at startup and won't see Node until they restart. (This is separate from the `npx` bug noted above — this one's about Node not being found at all, not about how it's spawned.)

## Troubleshooting

### `MCP error -32000: Connection closed`

This is the generic symptom when the MCP server process (`node dist/index.js`) exits before completing the MCP handshake — most often on a fresh clone or a new machine. It does **not** point at any single cause, so work through the list below, most likely first.

The fastest way to see the **real** error (the one Claude Code hides behind `Connection closed`) is to run the project's own smoke test from the repo root — it spawns the server exactly like Claude Code does and prints whatever the server chokes on:

```
node scripts/smoke-mcp.mjs
```

A healthy run ends with `✓ MCP handshake: initialize -> tools/list`. Anything else is the actual error — match it against the causes below.

1. **Node is missing or too old.** Web Eyes needs **Node.js 20 LTS or newer** (its PDF support pulls in `pdfjs-dist` v6, which won't load on older Node). Check with `node -v`. If it's below 20 — or `node` isn't found at all — install Node 20+ and **fully restart** your terminal/editor (see the Requirements note above).

2. **`node` isn't on the PATH Claude Code inherited.** Claude Code spawns the server with a bare `node`. If Claude Code (or the editor hosting it) was already running when you installed Node, it captured the old `PATH` and can't find `node`. Fully quit and reopen Claude Code (or reboot).

3. **Dependencies didn't come with the clone.** As a plugin, the server runs from `plugin/dist/` with its `plugin/node_modules/` — both are committed, so a plain `git clone` already has everything. If you cloned only part of the repo, or the bundle looks incomplete, regenerate it from the repo root with `node scripts/prepare-plugin.mjs` (needs `npm`).

4. **The plugin isn't registered on this machine.** Cloning the repo doesn't register it with Claude Code by itself. Re-add the marketplace and enable the plugin (`/plugin marketplace add …` then `/plugin`), and restart Claude Code.

### Chrome-related errors (server starts, capture fails)

These appear *after* the server is connected, when you actually trigger a capture — so the handshake above already passed.

- **"Couldn't find a Chrome install…"** — Web Eyes looks for a stock Google Chrome in the usual per-OS locations. For a portable Chrome, Brave, or a non-standard path, set `WEB_EYES_CHROME_PATH` to your browser's executable.
- **"debug port 9222 never responded…"** — a normal Chrome was already running and ignored the debug flag. Close **all** Chrome windows (including background ones) and try again.

## Author

Made by **Diego Dias**.

- Website: [newlevel.com.br](https://www.newlevel.com.br)
- LinkedIn: [in/diegodias93](https://www.linkedin.com/in/diegodias93/)

## License

[MIT](LICENSE) © 2026 Diego Dias
