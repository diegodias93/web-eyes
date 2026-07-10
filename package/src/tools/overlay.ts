import type { Page } from "playwright-core";

export type WatchAction = "text" | "image" | "full" | "dom" | "stop";

// The overlay sends one of two events through the binding: a button action, or a
// typed message (so the user can talk without leaving listen mode). A capture
// action may also carry the text that was in the box, so the user can type a
// message AND capture in one go (e.g. "explain this" + Image).
export type WatchEvent =
  | { kind: "action"; action: WatchAction; text?: string }
  | { kind: "message"; text: string };

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

  // buildOverlay re-runs on every re-inject (sweep / navigation). The previous
  // run left document-level key listeners behind (they close over the old host);
  // remove them first so they don't pile up. We stash the cleanup on window.
  const KEY = "__webEyesKeyCleanup";
  (window as any)[KEY]?.();

  const host = document.createElement("div");
  host.id = id;
  // Anchored by top/left (in px) rather than bottom/left so the right-drag below
  // can reposition it freely. Start at the same lower-left spot as before.
  host.style.cssText =
    "position:fixed;left:16px;top:" +
    Math.max(16, window.innerHeight - 240) +
    "px;z-index:2147483647;";
  // Right-click anywhere on the overlay shouldn't pop the browser's context menu
  // (the right-drag below uses the right button to move the panel).
  host.addEventListener("contextmenu", (e) => e.preventDefault());
  const shadow = host.attachShadow({ mode: "open" });

  // System font stack — no external font request, so nothing leaves the machine.
  const FONT = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";

  // Pulsing "…" appended to the clicked button while Claude is looking. Keyframes
  // live in the Shadow DOM so the site's CSS can neither see nor break them.
  const style = document.createElement("style");
  style.textContent =
    "@keyframes __we_blink{0%,100%{opacity:.25}50%{opacity:1}}" +
    ".__we_dots{display:inline-block;animation:__we_blink 1s ease-in-out infinite}";
  shadow.appendChild(style);

  // Fires an event through the binding (CDP channel, not network → no CSP issues).
  const send = (payload: unknown) => {
    const fn = (window as any)[binding];
    if (fn) fn(payload);
  };

  // Outer column: message row on top, button row below.
  const col = document.createElement("div");
  col.style.cssText =
    "display:flex;flex-direction:column;gap:8px;" +
    "background:#000;padding:8px;border-radius:10px;border:1px solid #333;" +
    "box-shadow:0 4px 16px rgba(0,0,0,.5);";

  // Shared button look, so Send matches Text/Image/Dom/Stop exactly.
  const BTN =
    "cursor:pointer;border-radius:8px;padding:8px 16px;min-width:78px;" +
    "font-family:" + FONT + ";font-size:16px;font-weight:700;" +
    "line-height:1;text-align:center;box-sizing:border-box;";

  // Message box (with its own drag handle) on its own row, full width. Send lives
  // in the button row below (as an icon), so it always lines up with Text/Image/
  // Dom/Stop regardless of how tall the box is.
  const boxCol = document.createElement("div");
  boxCol.style.cssText = "display:flex;flex-direction:column;min-width:280px;";

  const handle = document.createElement("div");
  handle.title = "Drag to resize · right-drag to move";
  handle.style.cssText =
    "height:14px;cursor:ns-resize;display:flex;align-items:center;justify-content:center;" +
    "color:#666;font-size:12px;line-height:1;user-select:none;";
  handle.textContent = "⠿"; // grip dots
  // Two drags from the same handle, told apart by mouse button:
  //  - left (button 0): resize — grow/shrink the message box vertically;
  //  - right (button 2): move — reposition the whole overlay on screen.
  // Listeners go on the document so the drag keeps working past the handle's
  // edges; stopPropagation so the site never sees these events.
  const MIN_H = 64;
  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const right = e.button === 2;
    const startX = e.clientX;
    const startY = e.clientY;
    const startH = input.offsetHeight;
    const startLeft = host.offsetLeft;
    const startTop = host.offsetTop;
    const maxH = Math.max(MIN_H, window.innerHeight - 120);
    const onMove = (m: MouseEvent) => {
      m.stopPropagation();
      if (right) {
        // Move the panel, clamped so it can't be dragged off-screen.
        const maxLeft = Math.max(0, window.innerWidth - host.offsetWidth);
        const maxTop = Math.max(0, window.innerHeight - host.offsetHeight);
        host.style.left =
          Math.min(maxLeft, Math.max(0, startLeft + (m.clientX - startX))) + "px";
        host.style.top =
          Math.min(maxTop, Math.max(0, startTop + (m.clientY - startY))) + "px";
      } else {
        const next = Math.min(maxH, Math.max(MIN_H, startH + (startY - m.clientY)));
        input.style.height = next + "px";
      }
    };
    const onUp = (u: MouseEvent) => {
      u.stopPropagation();
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("mouseup", onUp, true);
    };
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("mouseup", onUp, true);
  });

  const input = document.createElement("textarea");
  input.placeholder = "Message Claude… (Enter to send, Shift+Enter for newline)";
  input.style.cssText =
    "width:100%;height:64px;resize:none;box-sizing:border-box;" +
    "font-family:" + FONT + ";font-size:14px;line-height:1.3;" +
    "padding:8px 10px;border-radius:8px;border:1px solid #333;" +
    "background:#111;color:#fff;outline:none;";
  const submit = () => {
    const text = input.value.trim();
    if (text) {
      send({ kind: "message", text });
      input.value = "";
    }
  };

  // Stop the user's typing from ever reaching the site's keyboard shortcuts
  // (Space pauses YouTube, "/" focuses search, j/k/l seek, etc.). The catch: the
  // capture phase descends window → document → … → target, and sites register
  // their shortcut listeners on `document` in capture, on page load — BEFORE our
  // overlay exists. So intercepting on document (or inside the shadow) always
  // loses: document sees the key first. Registering on `window` in capture wins,
  // because window captures before document. We kill only keys from our overlay
  // (shadow retargeting makes event.target the host). Verified with a preview
  // simulating a YouTube-style document/capture listener.
  const swallowKeys = (e: KeyboardEvent) => {
    if (e.target === host) {
      e.stopImmediatePropagation();
      e.stopPropagation();
    }
  };
  const keyTypes = ["keydown", "keyup", "keypress"] as const;
  for (const type of keyTypes) {
    window.addEventListener(type, swallowKeys, true); // window + capture = runs first
  }
  // Remembered so the next buildOverlay (re-inject) can detach these first.
  (window as any)[KEY] = () => {
    for (const type of keyTypes) window.removeEventListener(type, swallowKeys, true);
  };

  // Enter (without Shift) sends; Shift+Enter is a newline. preventDefault stops
  // the textarea from inserting a line break on send.
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });

  boxCol.appendChild(handle);
  boxCol.appendChild(input);

  // Button row. Vercel-style: monochrome buttons, dark surface with a subtle
  // border. The Stop button is the only colored one (red), so it stands out.
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;gap:8px;align-items:center;";

  const mkBtn = (label: string, action: string, opts: { bg: string; fg: string; border: string }) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.dataset.label = label; // remembered so the "…" state can be reverted
    b.dataset.action = action;
    b.style.cssText =
      BTN + `color:${opts.fg};background:${opts.bg};border:1px solid ${opts.border};`;
    b.onclick = () => {
      // A capture click carries any text in the box (so the user can type a
      // message AND capture in one go); the box is cleared once it's sent. Stop
      // never carries text.
      const text = action === "stop" ? "" : input.value.trim();
      send({ kind: "action", action, ...(text ? { text } : {}) });
      if (text) input.value = "";
    };
    return b;
  };

  const mono = { bg: "#111", fg: "#fff", border: "#333" };
  const red = { bg: "#e5484d", fg: "#fff", border: "#e5484d" };
  wrap.appendChild(mkBtn("Text", "text", mono));
  wrap.appendChild(mkBtn("Image", "image", mono));
  wrap.appendChild(mkBtn("Full", "full", mono));
  wrap.appendChild(mkBtn("Dom", "dom", mono));
  wrap.appendChild(mkBtn("Stop", "stop", red));

  // Send as an icon, in the button row after Stop — so it always lines up with
  // the other buttons no matter how tall the message box is.
  const sendBtn = document.createElement("button");
  sendBtn.title = "Send message";
  sendBtn.setAttribute("aria-label", "Send message");
  sendBtn.textContent = "➤";
  sendBtn.style.cssText = BTN + "min-width:48px;color:#fff;background:#111;border:1px solid #333;";
  sendBtn.onclick = submit;
  wrap.appendChild(sendBtn);

  col.appendChild(boxCol);
  col.appendChild(wrap);
  shadow.appendChild(col);
  document.documentElement.appendChild(host);
}

/**
 * Toggles the "capturing" state on the overlay of a page: the button for
 * `action` shows a pulsing "…" and the others dim/disable, so the user sees
 * Claude is looking. Passing null restores all buttons to idle. Runs in the
 * browser; self-contained (no external deps) so it ships as a string.
 */
function setOverlayBusy(id: string, action: string | null) {
  const host = document.getElementById(id);
  const shadow = host && (host as any).shadowRoot;
  if (!shadow) return;
  const buttons = shadow.querySelectorAll("button");
  buttons.forEach((b: HTMLButtonElement) => {
    const isActive = b.dataset.action === action;
    if (action && isActive) {
      b.innerHTML = b.dataset.label + '<span class="__we_dots">…</span>';
    } else {
      b.textContent = b.dataset.label || b.textContent;
    }
    // While busy, dim and disable every button except the one being captured.
    const dim = action && !isActive;
    b.disabled = !!dim;
    b.style.opacity = dim ? "0.4" : "1";
  });
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
    .evaluate((id) => {
      document.getElementById(id)?.remove();
      // Also detach the document-level key listeners buildOverlay added.
      (window as any)["__webEyesKeyCleanup"]?.();
      (window as any)["__webEyesKeyCleanup"] = undefined;
    }, OVERLAY_ID)
    .catch(() => {});
}

/**
 * Shows the "capturing…" state on a page's overlay (pulsing "…" on the clicked
 * button), or clears it back to idle when `action` is null. We inline
 * setOverlayBusy's source (like overlayInitScript) so it runs in the page with
 * no external deps.
 */
export async function setOverlayBusyOn(page: Page, action: WatchAction | null): Promise<void> {
  const script = `(${setOverlayBusy.toString()})(${JSON.stringify(OVERLAY_ID)}, ${JSON.stringify(action)});`;
  await page.evaluate(script).catch(() => {});
}

/**
 * Hides or shows a page's overlay (visibility:hidden, not removal — keeping it in
 * the DOM means the sweep won't re-inject a fresh one). Used to keep the overlay
 * out of captures: it's the user's control surface, not page content.
 */
export async function setOverlayHiddenOn(page: Page, hidden: boolean): Promise<void> {
  await page
    .evaluate(
      ([id, h]) => {
        const host = document.getElementById(id as string);
        if (host) host.style.visibility = h ? "hidden" : "visible";
      },
      [OVERLAY_ID, hidden] as const
    )
    .catch(() => {});
}

export { CLICK_BINDING, OVERLAY_ID };
