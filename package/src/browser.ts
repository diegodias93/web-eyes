import { chromium, type Browser, type Page } from "playwright-core";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const CDP_HOST = "localhost";
const CDP_PORT = 9222;
const CDP_ENDPOINT = `http://${CDP_HOST}:${CDP_PORT}`;

// Dedicated debugging profile so it coexists with the user's everyday Chrome
// (different profile = both can run at the same time, each with its own logins).
const USER_DATA_DIR = "C:\\tmp\\chrome-debug";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

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
export async function withActivePage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const browser = await connectBrowser();
  try {
    const page = await pickActivePage(browser);
    return await fn(page);
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
  // Check the path up front: spawn's "error" event is async on Windows and races
  // with the caller, so it can't be relied on to surface a bad path.
  if (!existsSync(CHROME_PATH)) {
    throw new Error(
      `Couldn't find Chrome at "${CHROME_PATH}". ` +
        "Edit CHROME_PATH, or open Chrome manually with --remote-debugging-port=9222 (see README)."
    );
  }
  const child = spawn(
    CHROME_PATH,
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
