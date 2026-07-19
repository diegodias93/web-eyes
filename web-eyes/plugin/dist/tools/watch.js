import { sharedBrowser, closeSharedBrowser } from "../browser.js";
import { injectOverlay, removeOverlay, setOverlayBusyOn, setOverlayHiddenOn, CLICK_BINDING, OVERLAY_ID, } from "./overlay.js";
import { runText } from "./text.js";
import { runScreenshot, runFullScreenshot } from "./screenshot.js";
import { runDom } from "./dom.js";
export const watchTool = {
    name: "watch",
    description: "Enters listen mode: shows a message box + 5 buttons (text, image, full, dom, stop) in the Chrome tab " +
        "and waits for the user to click a button or send a message. Returns the click or the message. " +
        "Used to drive the /look-watch loop.",
    inputSchema: {
        type: "object",
        properties: {},
    },
};
let pendingResolve = null;
let bufferedEvent = null;
// The browser instance the binding is currently exposed on. If the connection
// drops and sharedBrowser() reconnects, this won't match and we re-expose —
// otherwise the new connection's buttons would be dead.
let boundBrowser = null;
/**
 * Shows the overlay on EVERY tab (current and future) and resolves with the
 * event the user triggers (a button click or a typed message), on whichever tab.
 * `onHeartbeat` (optional) fires every ~30s while waiting, so the caller can emit
 * MCP progress and dodge the client's idle timeout. The overlay is left up
 * between calls (removed only by stopWatch), so re-arming after an event or an
 * Esc never drops a button or an event.
 */
export async function waitForEvent(onHeartbeat, signal) {
    const browser = await sharedBrowser();
    const ctx = browser.contexts()[0];
    // Expose the binding once per connection (re-exposing on the same one throws; a
    // fresh connection after a drop needs it again). It routes to the active wait,
    // or buffers the event if we're between re-arms.
    if (boundBrowser !== browser) {
        boundBrowser = browser;
        await ctx
            .exposeBinding(CLICK_BINDING, (src, e) => {
            // src.page is the tab the click/message came from — kept so the capture
            // below runs on exactly that tab.
            const sourced = { event: e, page: src.page };
            if (pendingResolve)
                pendingResolve(sourced);
            else
                bufferedEvent = sourced; // landed in the gap — deliver on next wait
        })
            .catch(() => { });
    }
    let poll;
    let beat;
    const event = await new Promise((resolve, reject) => {
        let settled = false;
        const cleanup = () => {
            pendingResolve = null;
            clearInterval(poll);
            clearInterval(beat);
        };
        const finish = (e) => {
            if (settled)
                return;
            settled = true;
            cleanup();
            resolve(e);
        };
        pendingResolve = finish;
        // Esc (request cancelled): tear down the timers and stale resolver so the
        // loop doesn't leak intervals or route a later event to a dead promise.
        if (signal) {
            if (signal.aborted) {
                cleanup();
                reject(new Error("aborted"));
                return;
            }
            signal.addEventListener("abort", () => {
                if (settled)
                    return;
                settled = true;
                cleanup();
                reject(new Error("aborted"));
            }, { once: true });
        }
        // An event that arrived during the gap (e.g. while the user was typing after
        // Esc) is delivered the moment we re-arm — nothing is lost.
        if (bufferedEvent) {
            const e = bufferedEvent;
            bufferedEvent = null;
            finish(e);
            return;
        }
        // Keep every open tab overlaid by POLLING — not by page "load"/addInitScript
        // events. Reason (verified): when a user types a URL into a chrome://new-tab
        // page, Chrome swaps the CDP target, so Playwright's page object goes stale and
        // its load events stop firing. Polling re-injects wherever the overlay is gone.
        // The sweep also clears any leftover "capturing…" state so re-armed buttons
        // return to idle.
        const sweep = async () => {
            for (const page of ctx.pages().filter((p) => !p.isClosed())) {
                if (settled)
                    return; // an event landed mid-sweep — stop re-injecting
                const present = await page
                    .evaluate((id) => !!document.getElementById(id), OVERLAY_ID)
                    .catch(() => true); // ignore pages we can't evaluate (chrome://, etc.)
                if (!present)
                    await injectOverlay(page).catch(() => { });
                else
                    await setOverlayBusyOn(page, null).catch(() => { });
            }
        };
        sweep();
        poll = setInterval(sweep, 1000);
        beat = setInterval(() => onHeartbeat?.(), 30_000);
    });
    return event;
}
/** Tears down the overlay on every tab and drops the shared connection (on stop). */
async function stopWatch() {
    try {
        const browser = await sharedBrowser();
        const ctx = browser.contexts()[0];
        for (const page of ctx.pages().filter((p) => !p.isClosed())) {
            await removeOverlay(page).catch(() => { });
        }
    }
    catch {
        // connection already gone — nothing to clean
    }
    boundBrowser = null;
    pendingResolve = null;
    bufferedEvent = null;
    await closeSharedBrowser();
}
export async function runWatch(onHeartbeat, signal) {
    const { event, page: source } = await waitForEvent(onHeartbeat, signal);
    // A typed message: just hand the text back so Claude can reply. No capture, and
    // the overlay stays untouched — the loop keeps going (the skill re-arms watch).
    if (event.kind === "message") {
        return {
            content: [
                { type: "text", text: `WATCH_MSG: ${event.text}` },
            ],
        };
    }
    const action = event.action;
    if (action === "stop") {
        await stopWatch();
        return {
            content: [
                {
                    type: "text",
                    text: "WATCH_STOPPED — the user clicked stop. Exit listen mode; do not call watch again.",
                },
            ],
        };
    }
    // The tab the click came from — NOT "whatever tab is active now". Re-deriving
    // the active tab here would race with the user switching tabs between the click
    // and the capture, which would capture the wrong page.
    const page = source.isClosed() ? null : source;
    // Show the pulsing "…" on the clicked tab so the user sees Claude is looking;
    // it stays up through processing and is cleared by the next sweep (on re-arm).
    if (page)
        await setOverlayBusyOn(page, action).catch(() => { });
    // Hide the overlay just around the capture so it never lands in the result —
    // it's the user's control surface, not page content. Restore it right after so
    // the "…" feedback remains visible while Claude processes.
    if (page)
        await setOverlayHiddenOn(page, true).catch(() => { });
    const capture = action === "text"
        ? runText
        : action === "image"
            ? runScreenshot
            : action === "full"
                ? runFullScreenshot
                : runDom;
    // Passing the page pins the capture to the clicked tab (and reuses the shared
    // connection instead of opening another one).
    const result = await capture(page ?? undefined);
    if (page)
        await setOverlayHiddenOn(page, false).catch(() => { });
    return {
        content: [
            // The user may have typed a message alongside the capture — surface it
            // first so Claude answers it and comments on what it sees.
            ...(event.text ? [{ type: "text", text: `WATCH_MSG: ${event.text}` }] : []),
            { type: "text", text: `WATCH_CLICK: ${action}` },
            ...result.content,
        ],
    };
}
