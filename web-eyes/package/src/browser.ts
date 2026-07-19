import { chromium, type Browser, type Page } from "playwright-core";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CDP_HOST = "localhost";
const CDP_PORT = 9222;
const CDP_ENDPOINT = `http://${CDP_HOST}:${CDP_PORT}`;

// Dedicated debugging profile so it coexists with the user's everyday Chrome
// (different profile = both can run at the same time, each with its own logins).
// Lives under the OS temp dir so it's portable; override with WEB_EYES_PROFILE_DIR.
const USER_DATA_DIR =
  process.env.WEB_EYES_PROFILE_DIR || join(tmpdir(), "web-eyes-chrome-debug");

// Per-platform locations of a stock Chrome install. WEB_EYES_CHROME_PATH wins,
// for non-standard setups (portable Chrome, Brave, a different channel, etc.).
function chromeCandidates(): string[] {
  if (process.env.WEB_EYES_CHROME_PATH) return [process.env.WEB_EYES_CHROME_PATH];
  if (process.platform === "win32") {
    const dirs = [
      process.env.PROGRAMFILES,
      process.env["PROGRAMFILES(X86)"],
      process.env.LOCALAPPDATA,
    ].filter(Boolean) as string[];
    return dirs.map((d) => join(d, "Google", "Chrome", "Application", "chrome.exe"));
  }
  if (process.platform === "darwin") {
    return ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
  }
  return [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
}

/** First existing Chrome from the per-platform candidates, or null if none. */
function resolveChromePath(): string | null {
  return chromeCandidates().find((p) => existsSync(p)) ?? null;
}

/**
 * Makes sure the debug Chrome is running: if the port is cold, launches it
 * (flag + dedicated profile) and waits for it to come up. Returns true if it
 * had to launch a new one, false if it was already running.
 */
export async function ensureChrome(): Promise<boolean> {
  if (await isDebugPortUp()) return false;
  launchChrome();
  await waitForDebugPort();
  return true;
}

/**
 * Ensures Chrome is up, then connects over CDP and returns the live Browser.
 * Caller is responsible for closing it (or keeping it open for a watch loop).
 */
export async function connectBrowser() {
  await ensureChrome();
  return chromium.connectOverCDP(CDP_ENDPOINT);
}

// A single CDP connection reused across watch re-arms. The watch loop re-enters
// many times (once per click); reconnecting each time both costs latency and
// drops the overlay between cycles. We hold one connection open for the whole
// loop and only close it on stop (see closeSharedBrowser).
let shared: Browser | null = null;

/** The shared connection for the watch loop, connecting (or reconnecting) lazily. */
export async function sharedBrowser(): Promise<Browser> {
  if (shared && shared.isConnected()) return shared;
  shared = await connectBrowser();
  return shared;
}

/** Disconnects the shared watch connection (does NOT close the user's Chrome). */
export async function closeSharedBrowser(): Promise<void> {
  const b = shared;
  shared = null;
  await b?.close().catch(() => {});
}

/** Picks the focused tab among a browser's open pages (active-tab heuristic). */
export async function pickActivePage(browser: Browser): Promise<Page> {
  const pages = browser
    .contexts()
    .flatMap((ctx) => ctx.pages())
    .filter((p) => !p.isClosed());
  if (pages.length === 0) {
    throw new Error(
      "Connected to Chrome, but it has no open tabs. " +
        "Open a tab and navigate to a page, then try again."
    );
  }
  // Active tab = first "page" in CDP's /json/list (most-recently-used order; the
  // DOM's visibilityState/hasFocus are unreliable over CDP). Match by URL first
  // (cheap); fall back to targetId when URLs are ambiguous or don't match (e.g.
  // chrome:// pages, whose URL differs between CDP and Playwright).
  const active = await getActiveTarget();
  if (active) {
    const sameUrl = pages.filter((p) => p.url() === active.url);
    if (sameUrl.length === 1) return sameUrl[0];
    const candidates = sameUrl.length > 1 ? sameUrl : pages;
    for (const page of candidates) {
      if ((await getTargetId(page)) === active.id) return page;
    }
  }
  return pages[0];
}

/**
 * Connects to the user's Chrome, runs `fn` against the focused tab, then closes
 * the CDP connection — so each capture doesn't leak a websocket. (close() on a
 * connectOverCDP browser only DISCONNECTS; it never closes the user's Chrome.)
 *
 * If no Chrome is listening on the debug port, it launches one automatically
 * (with the flag + the dedicated profile) and waits for it to come up.
 */
export async function withActivePage<T>(
  fn: (page: Page) => Promise<T>,
  page?: Page
): Promise<T> {
  // A caller that already knows WHICH page it wants (the watch loop knows the tab
  // the user clicked) passes it in: we run against that exact tab and skip both
  // the extra CDP connection and the active-tab heuristic — re-running the
  // heuristic here could land on a different tab if the user switched in between.
  if (page) return fn(page);

  const browser = await connectBrowser();
  try {
    return await fn(await pickActivePage(browser));
  } finally {
    await browser.close().catch(() => {});
  }
}

/** First "page" target from CDP's /json/list (most-recently-used first). */
async function getActiveTarget(): Promise<{ id: string; url: string } | null> {
  try {
    const res = await fetch(`${CDP_ENDPOINT}/json/list`);
    const targets = (await res.json()) as Array<{ type: string; id: string; url: string }>;
    const page = targets.find((t) => t.type === "page");
    return page ? { id: page.id, url: page.url } : null;
  } catch {
    return null;
  }
}

/** The CDP targetId backing a Playwright page (matches /json/list ids). */
async function getTargetId(page: Page): Promise<string | null> {
  try {
    const session = await page.context().newCDPSession(page);
    const info = await session.send("Target.getTargetInfo");
    await session.detach();
    return info.targetInfo.targetId;
  } catch {
    return null;
  }
}

async function isDebugPortUp(): Promise<boolean> {
  try {
    const res = await fetch(`${CDP_ENDPOINT}/json/version`);
    return res.ok;
  } catch {
    return false;
  }
}

function launchChrome(): void {
  // Resolve the path up front: spawn's "error" event is async on Windows and
  // races with the caller, so it can't be relied on to surface a bad path.
  const chromePath = resolveChromePath();
  if (!chromePath) {
    throw new Error(
      "Couldn't find a Chrome install in the usual locations. " +
        "Set WEB_EYES_CHROME_PATH to your Chrome binary, or open Chrome manually " +
        "with --remote-debugging-port=9222 (see README)."
    );
  }
  const child = spawn(
    chromePath,
    [`--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${USER_DATA_DIR}`],
    { detached: true, stdio: "ignore" }
  );
  child.unref();
}

async function waitForDebugPort(timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isDebugPortUp()) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(
    `Chrome was launched but debug port ${CDP_PORT} never responded within 15s. ` +
      "This usually means another Chrome was already running and ignored the debug flag. " +
      "Close all Chrome windows (including background ones) and try again."
  );
}
