# Web Eyes 👁️

MCP server that gives **Claude Code** eyes on a Chrome tab. Capture the page's **text** (clean, reader-mode style), a **screenshot**, or its **DOM**, so you can discuss any website together with Claude. Runs on your Claude Code subscription, no paid API.

Private by design: no telemetry, no analytics, nothing leaves your machine except the page content you choose to capture (which goes only to your own Claude Code session). It opens a separate, isolated Chrome profile, so your everyday browser stays untouched.

## Install

As a Claude Code plugin (recommended, adds an on/off switch and the trigger skills):

```
/plugin marketplace add diegodias93/web-eyes
```

Or as an MCP server only:

```
claude mcp add web-eyes -- npx -y @diegodias93/web-eyes@latest
```

Then navigate to a page in Chrome and tell Claude *"look at my tab"*. Chrome is launched automatically on a dedicated debug profile.

## Tools

| Tool                 | What it does                                                  |
| -------------------- | ------------------------------------------------------------ |
| `open_chrome`        | Opens the debug Chrome (no capture) so you can log in or navigate first |
| `capture_text`       | Clean main content (via Mozilla Readability) plus relevant links |
| `capture_screenshot` | A PNG image of the page                                      |
| `capture_dom`        | The full HTML                                                |
| `watch`              | Hands-free mode: shows clickable buttons in the tab and captures on click |

## Full docs

See the [project README](https://github.com/diegodias93/web-eyes#readme) for how it works, privacy notes, and requirements.

## License

MIT
