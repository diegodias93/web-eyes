# web-eyes

**Let Claude Code see the web page you're looking at.**

Normally, Claude Code can read your files and run commands — but it can't see your browser. So when you're reading some documentation, a dashboard, or any website and want Claude's help, you end up copy-pasting text back and forth.

**web-eyes fixes that.** You open a page in Chrome, say *"look at my tab"*, and Claude instantly sees what's on screen — the text, a screenshot, or the page's HTML. Then you just talk about it together, like you're both looking at the same screen.

A real example: you're learning the **WhatsApp API** from Meta's docs. Instead of copying paragraphs into the chat, you say *"look at my tab"* and ask *"explain how authentication works here"* — Claude reads the page and answers.

> 💡 It runs on your **Claude Code subscription** — no extra paid API, no API keys.

---

## Commands

You trigger web-eyes with plain language ("look at my tab") or with the slash commands below. Each one captures the page a different way, for a different purpose.

| Command         | What it does                            | Best for                                                        |
| --------------- | --------------------------------------- | --------------------------------------------------------------- |
| `/look-chrome`  | **Opens** the browser (captures nothing)| Preparing first — log in / navigate before capturing.           |
| `/look-text`    | Claude reads the page's **clean text**  | Reading docs, articles, anything written. Fastest & cheapest.   |
| `/look-image`   | Claude sees a **picture** of the page   | Layout, design, charts, or pages that only render with JavaScript. |
| `/look-dom`     | Claude gets the page's **HTML code**    | Understanding the page structure — elements, classes, tags.     |
| `/look-watch`   | **Hands-free mode** — buttons in the tab| Click **Text** / **Image** / **Dom** in the browser to capture; no typing. **Stop** to end. |

You don't have to memorize these — saying things like *"look at my tab"*, *"take a screenshot of this page"*, or *"show me the HTML"* works too.

> 📖 `/look-text` reads like a reader-mode view: it strips menus, sidebars, footers and cookie banners (powered by Mozilla's Readability) and hands Claude just the main content plus the page's relevant links. Less noise, fewer tokens, better answers.

### Watch mode (`/look-watch`)

Run it once and web-eyes drops a small toolbar into your Chrome tabs:

```
┌──────┬───────┬─────┬──────┐
│ Text │ Image │ Dom │ Stop │
└──────┴───────┴─────┴──────┘
```

Now you just browse and **click** — each button captures that tab and hands it to Claude, who reacts. No switching back to type commands. Click **Stop** when you're done. The toolbar follows you across tabs and navigations. (It can't appear on `chrome://` pages, PDFs, or sites with a very strict CSP.)

---

## Install

### As a plugin (recommended — adds an on/off switch)

```
/plugin marketplace add diegodias93/web-eyes
/plugin
```

Turn on **dd-web-eyes** in the list, restart Claude Code, and say *"look at my tab"*.

### As an MCP server only (no plugin UI)

```
claude mcp add web-eyes -- npx -y @diegodias93/web-eyes@latest
```

> The first run downloads the package automatically (a few seconds). After that it's cached.

---

## How it works (the technical bit)

```
[your Chrome] --debug port 9222 (CDP)--> [Playwright] --> [MCP server] --stdio--> [Claude Code]
```

web-eyes opens a **separate Chrome window** on its own profile (`C:\tmp\chrome-debug`), with Chrome's debugging port enabled. It connects to that window to read whatever tab you have **in focus** (detected via CDP's most-recently-used target — not the DOM's unreliable `visibilityState`). It launches this Chrome automatically — you don't run any command by hand.

For text capture, it injects [Mozilla's Readability](https://github.com/mozilla/readability) into the page and runs it on a clone of the DOM, so the live page is never touched. Non-article pages (apps, dashboards) gracefully fall back to the raw body text.

**Why a separate Chrome?** Two reasons:

1. **It coexists with your everyday Chrome** — both run at the same time, each with its own logins. Your normal browsing is untouched.
2. **Privacy** — only the tabs in this debug Chrome are visible to Claude. Your everyday Chrome, with your email and banking logged in, stays completely invisible.

On first use, this debug Chrome is logged out. Log in once to whatever you need (e.g. your Meta developer account) — those logins stick around for next time.

---

## Project layout

```
web-eyes/
├── .claude-plugin/marketplace.json   # the plugin marketplace (root)
├── plugin/                           # the Claude Code plugin (skills + .mcp.json)
└── package/                          # the npm package (@diegodias93/web-eyes)
```

## Requirements

- Node.js LTS
- Google Chrome

## License

MIT
