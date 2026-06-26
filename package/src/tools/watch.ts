import { connectBrowser } from "../browser.js";
import { injectOverlay, removeOverlay, CLICK_BINDING, OVERLAY_ID, type WatchAction } from "./overlay.js";
import { runText } from "./text.js";
import { runScreenshot } from "./screenshot.js";
import { runDom } from "./dom.js";

export const watchTool = {
  name: "watch",
  description:
    "Enters listen mode: shows 4 buttons (text, image, dom, stop) in the Chrome tab and waits " +
    "for the user to click one. Returns which button was clicked. Used to drive the /look-watch loop.",
  inputSchema: {
    type: "object" as const,
    properties: {},
  },
};

/**
 * Shows the overlay on EVERY tab (current and future) and resolves with the
 * action the user clicks, on whichever tab. `onHeartbeat` (optional) fires every
 * ~30s while waiting, so the caller can emit MCP progress and dodge the client's
 * idle timeout.
 */
export async function waitForClick(onHeartbeat?: () => void): Promise<WatchAction> {
  const browser = await connectBrowser();
  const ctx = browser.contexts()[0];

  let poll: NodeJS.Timeout;
  let beat: NodeJS.Timeout;
  const action = await new Promise<WatchAction>((resolve) => {
    let settled = false;
    const finish = (a: WatchAction) => {
      if (settled) return;
      settled = true;
      clearInterval(poll);
      clearInterval(beat);
      resolve(a);
    };

    // Buttons call this exposed binding (CDP channel, not network → no CSP issues).
    // Context-level so it reaches every tab; ignore "already exposed" on re-entry.
    ctx
      .exposeBinding(CLICK_BINDING, (_src, a: WatchAction) => finish(a))
      .catch(() => {});

    // Keep every open tab overlaid by POLLING — not by page "load"/addInitScript
    // events. Reason (verified): when a user types a URL into a chrome://new-tab
    // page, Chrome swaps the CDP target, so Playwright's page object goes stale and
    // its load events stop firing. Polling re-injects wherever the overlay is gone.
    const sweep = async () => {
      for (const page of ctx.pages().filter((p) => !p.isClosed())) {
        if (settled) return; // a click landed mid-sweep — stop re-injecting
        const present = await page
          .evaluate((id) => !!document.getElementById(id), OVERLAY_ID)
          .catch(() => true); // ignore pages we can't evaluate (chrome://, etc.)
        if (!present) await injectOverlay(page).catch(() => {});
      }
    };
    sweep();
    poll = setInterval(sweep, 1000);
    beat = setInterval(() => onHeartbeat?.(), 30_000);
  });

  for (const page of ctx.pages().filter((p) => !p.isClosed())) {
    await removeOverlay(page).catch(() => {});
  }
  await browser.close().catch(() => {});
  return action;
}

export async function runWatch(onHeartbeat?: () => void) {
  const action = await waitForClick(onHeartbeat);

  if (action === "stop") {
    return {
      content: [
        {
          type: "text" as const,
          text: "WATCH_STOPPED — the user clicked stop. Exit listen mode; do not call watch again.",
        },
      ],
    };
  }

  // The clicked tab is the active one, so reuse the capture tools directly. Each
  // result is prefixed so the model knows which mode produced it and to keep
  // listening (the /look-watch skill re-invokes watch after handling this).
  const capture =
    action === "text" ? runText : action === "image" ? runScreenshot : runDom;
  const result = await capture();
  return {
    content: [
      { type: "text" as const, text: `WATCH_CLICK: ${action}` },
      ...result.content,
    ],
  };
}
