import type { Page } from "playwright-core";

export type WatchAction = "text" | "image" | "dom" | "stop";

const OVERLAY_ID = "__webeyes_overlay";
const CLICK_BINDING = "__webEyesClick";

/**
 * Builds the overlay (4 buttons) in a Shadow DOM so the site's CSS can't break
 * it. Runs in the browser context. Buttons call the page-exposed CLICK_BINDING.
 * Idempotent: re-running just refreshes it. Self-contained so it works both via
 * page.evaluate (current tabs) and addInitScript (future tabs/navigations).
 */
function buildOverlay(id: string, binding: string) {
  if (!document.documentElement) return;
  document.getElementById(id)?.remove();

  const host = document.createElement("div");
  host.id = id;
  host.style.cssText = "position:fixed;bottom:16px;left:16px;z-index:2147483647;";
  const shadow = host.attachShadow({ mode: "open" });

  // Load Plus Jakarta Sans inside the Shadow DOM (with a sans-serif fallback if
  // the network/font is unavailable).
  const font = document.createElement("link");
  font.rel = "stylesheet";
  font.href =
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700&display=swap";
  shadow.appendChild(font);

  const wrap = document.createElement("div");
  wrap.style.cssText =
    "display:flex;gap:8px;align-items:center;" +
    "background:#000;padding:8px;border-radius:10px;border:1px solid #333;" +
    "box-shadow:0 4px 16px rgba(0,0,0,.5);";

  // Vercel-style: monochrome buttons, dark surface with a subtle border. The Stop
  // button is the only colored one (red), so it stands out.
  const mkBtn = (label: string, action: string, opts: { bg: string; fg: string; border: string }) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText =
      "cursor:pointer;border-radius:8px;padding:8px 16px;min-width:78px;" +
      "font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;font-weight:700;" +
      "line-height:1;text-align:center;" +
      `color:${opts.fg};background:${opts.bg};border:1px solid ${opts.border};`;
    b.onclick = () => {
      const fn = (window as any)[binding];
      if (fn) fn(action);
    };
    return b;
  };

  const mono = { bg: "#111", fg: "#fff", border: "#333" };
  const red = { bg: "#e5484d", fg: "#fff", border: "#e5484d" };
  wrap.appendChild(mkBtn("Text", "text", mono));
  wrap.appendChild(mkBtn("Image", "image", mono));
  wrap.appendChild(mkBtn("Dom", "dom", mono));
  wrap.appendChild(mkBtn("Stop", "stop", red));

  shadow.appendChild(wrap);
  document.documentElement.appendChild(host);
}

/** Injects the overlay into a page that's already open. */
export async function injectOverlay(page: Page): Promise<void> {
  // Pass buildOverlay's source into the page context (it isn't defined there).
  await page.evaluate(overlayInitScript());
}

/**
 * A self-contained init script (string) that injects the overlay on every new
 * page/navigation. We pass buildOverlay's source inline so it has no external deps.
 */
export function overlayInitScript(): string {
  return `(${buildOverlay.toString()})(${JSON.stringify(OVERLAY_ID)}, ${JSON.stringify(CLICK_BINDING)});`;
}

/** Removes the overlay from a page (used when the watch stops). */
export async function removeOverlay(page: Page): Promise<void> {
  await page
    .evaluate((id) => document.getElementById(id)?.remove(), OVERLAY_ID)
    .catch(() => {});
}

export { CLICK_BINDING, OVERLAY_ID };
