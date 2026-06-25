import { chromium, type Page } from "playwright-core";
import { spawn } from "node:child_process";

const CDP_HOST = "localhost";
const CDP_PORT = 9222;
const CDP_ENDPOINT = `http://${CDP_HOST}:${CDP_PORT}`;

// Dedicated debugging profile so it coexists with the user's everyday Chrome
// (different profile = both can run at the same time, each with its own logins).
const USER_DATA_DIR = "C:\\tmp\\chrome-debug";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

/**
 * Connects to the Chrome the user already has open (via the remote debugging port)
 * and returns the focused tab. Never opens its own Chromium — uses the real logins.
 *
 * If no Chrome is listening on the debug port, it launches one automatically
 * (with the flag + the dedicated profile) and waits for it to come up.
 */
export async function getActivePage(): Promise<Page> {
  if (!(await isDebugPortUp())) {
    await launchChrome();
    await waitForDebugPort();
  }

  const browser = await chromium.connectOverCDP(CDP_ENDPOINT);
  const contexts = browser.contexts();
  const pages = contexts.flatMap((ctx) => ctx.pages()).filter((p) => !p.isClosed());
  if (pages.length === 0) {
    throw new Error("Chrome is connected, but there are no open tabs.");
  }

  // The foreground tab is the one Chrome reports as visible. Ask each page for its
  // document.visibilityState and pick the first "visible" one.
  for (const page of pages) {
    try {
      const isVisible = await page.evaluate(() => document.visibilityState === "visible");
      if (isVisible) return page;
    } catch {
      // page without an evaluable JS context (e.g. chrome://) — skip it
    }
  }

  // No visible tab (e.g. window minimized): fall back to the last known one.
  return pages[pages.length - 1];
}

async function isDebugPortUp(): Promise<boolean> {
  try {
    const res = await fetch(`${CDP_ENDPOINT}/json/version`);
    return res.ok;
  } catch {
    return false;
  }
}

function launchChrome(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const child = spawn(
        CHROME_PATH,
        [`--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${USER_DATA_DIR}`],
        { detached: true, stdio: "ignore" }
      );
      child.on("error", () =>
        reject(
          new Error(
            `Couldn't launch Chrome at "${CHROME_PATH}". ` +
              "Check the path or open Chrome manually with --remote-debugging-port=9222 (see README)."
          )
        )
      );
      child.unref();
      resolve();
    } catch {
      reject(new Error(`Couldn't launch Chrome at "${CHROME_PATH}".`));
    }
  });
}

async function waitForDebugPort(timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isDebugPortUp()) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("Chrome was launched but the debug port never came up within 15s.");
}
