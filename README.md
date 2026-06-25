# web-eyes

Give Claude Code **eyes on your Chrome tab** — screenshot, text and DOM — so you can discuss any website together with Claude (e.g. learning the WhatsApp API docs). Runs on your Claude Code subscription, no paid API.

```
[your Chrome] --port 9222 (CDP)--> [Playwright] --> [MCP server] --stdio--> [Claude Code]
```

## Install (plugin, with on/off switch)

```
/plugin marketplace add Pkdiego/web-eyes
/plugin
```

Enable **dd-web-eyes** in the list, restart Claude Code, then just say *"look at my tab"*.

## Install (MCP only, no plugin)

```
claude mcp add web-eyes -- npx -y @diegodias93/web-eyes@latest
```

## What you get

Three tools and three trigger skills:

| Tool / Skill                          | What it does             | When                          |
| ------------------------------------- | ------------------------ | ----------------------------- |
| `capture_text` · `/look-tab`          | Visible text of the page | Read docs/articles (cheapest) |
| `capture_screenshot` · `/tab-screenshot` | Image of the page     | Layout/visuals, JS-rendered   |
| `capture_dom` · `/inspect-dom`        | Full HTML                | Inspect structure             |

## How it sees the tab

Chrome is launched automatically on a **dedicated debug profile** (`C:\tmp\chrome-debug`) with the remote debugging port, so it coexists with your everyday Chrome. On first use, log in once to whatever accounts you need in that profile — the logins persist. The MCP captures the tab that's **in focus**.

> Only tabs in this debug Chrome are visible to Claude. Your everyday Chrome stays invisible — by design.

## Layout

```
web-eyes/
├── .claude-plugin/marketplace.json   # plugin marketplace (root)
├── plugin/                           # the Claude Code plugin (skills + .mcp.json)
└── package/                          # the npm package (@diegodias93/web-eyes)
```

## Requirements

- Node.js LTS
- Google Chrome

## License

MIT
