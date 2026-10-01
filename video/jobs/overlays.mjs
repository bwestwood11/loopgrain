// Motion-graphic overlays for customer edits, ported from the hero spots (video/coaching,
// video/fitness). edit.mjs calls buildOverlays() with edit.json's "overlays" list:
//
//   "overlays": [
//     { "type": "title", "at": 0.2, "lines": ["Doing it all", "alone?"] },          // 2nd line gets a marker highlight
//     { "type": "lowerThird", "at": 3.6, "tag": "Your barber", "name": "Dana Ruiz", "meta": "Main Street Barbers · since 2014" },
//     { "type": "rating", "at": 4, "score": 4.9, "count": 212, "source": "Google" },
//     { "type": "stats", "at": 7.5, "items": [
//         { "label": "Hours a week", "was": 70, "to": 42 },                          // was: struck-out old value
//         { "label": "Revenue", "to": 38, "prefix": "+", "suffix": "%" } ] },       // counts up from "from" (default 0)
//     { "type": "checklist", "at": 5, "title": "The plan", "items": ["Hire help", "Raise prices", "Fridays off"] },
//     { "type": "circle", "at": 3.8, "x": 455, "y": 600, "label": "the turning point" },  // x/y in the 1080x1920 frame
//     { "type": "stamp", "at": 7.2, "text": "90 days later", "small": "After 12 sessions" },
//     { "type": "notifications", "at": 0.1, "items": [{ "app": "Phone", "msg": "3 missed calls" }, { "app": "Mail", "msg": "86 unread" }] },
//     { "type": "freeze", "at": 8.7, "caption": "Pool deck · Austin, TX" },    // flash, the frame freezes and drops into a tilted photo
//     { "type": "intro", "at": 0, "kicker": "Plan 01 · Backyard", "word": "Design", "drawing": "blueprint.svg" },
//         // full-frame brand-grid opener that wipes up into the footage; "drawing" is an optional SVG
//         // fragment in the job folder (1080x1920 coordinates) whose shapes draw themselves in
//     { "type": "tour", "at": 1.45, "stops": [{ "label": "Yard", "at": 1.6 }, { "label": "Pool deck", "at": 5.9 }, { "label": "Kitchen", "at": 11.4 }] }
//         // progress tracker that lights each stop at its time; it steps aside during freeze overlays
//   ]
//
// Every overlay takes "at" (seconds on the cut's timeline), an optional "duration" and an
// optional "y" (top edge in px; circle uses x/y as its centre). Defaults keep clear of the
// caption band (~1160-1440px) and the bottom ~420px that TikTok/Reels cover.
//
// Only state real facts here: names, ratings and numbers come from the brief or the customer.

const CAPTION_BAND = [1160, 1440];
const PLATFORM_UI = 1500;

// Anton/Inter average glyph widths in em, for shrinking long text to fit a box.
const fit = (text, maxPx, boxPx, emPerChar) => Math.round(Math.min(maxPx, boxPx / (emPerChar * Math.max(1, String(text).length))));

const decimalsOf = (n) => (String(n).split(".")[1] ?? "").length;
const fmt = (v, d, p = "", s = "") => p + Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) + s;

// A hand-drawn loop that overshoots its start, like a marker circle.
function ringPath(cx, cy, rx, ry) {
  let d = "";
  let len = 0;
  let px, py;
  for (let i = 0; i <= 64; i++) {
    const t = -Math.PI / 2 - 0.35 + (i / 64) * (Math.PI * 2 + 0.55);
    const w = 1 + 0.035 * Math.sin(t * 3 + 0.8) + 0.02 * Math.sin(t * 7);
    const x = cx + rx * w * Math.cos(t);
    const y = cy + ry * w * Math.sin(t);
    if (i) len += Math.hypot(x - px, y - py);
    d += (i ? " L " : "M ") + x.toFixed(1) + " " + y.toFixed(1);
    px = x;
    py = y;
  }
  return { d, len: Math.ceil(len) };
}

// Deep enough for a white letter at 3:1 or better.
const NOTE_COLORS = ["#e0412f", "#1f9d46", "#2563eb", "#7c4ddb", "#b86e00"];

export const OVERLAY_CSS = `
      .ov { position: absolute; opacity: 0; }
      .ov.anton, .ov .anton { font-family: "Anton", sans-serif; font-weight: 400; text-transform: uppercase; letter-spacing: 0.01em; }

      .ov-title { left: 70px; right: 40px; }
      .ov-title .l { display: block; overflow: hidden; }
      .ov-title .l span { display: block; line-height: 1.04; white-space: nowrap; color: #fff; text-shadow: 0 8px 30px rgba(0, 0, 0, 0.45); }
      .ov-title .mark { position: relative; display: inline-block; margin-top: 6px; }
      .ov-title .mark span { position: relative; z-index: 1; padding: 0 22px; color: var(--accent-text); text-shadow: none; }
      .ov-title .mark i { position: absolute; left: 14px; right: 14px; top: 16%; /* inset so the skewed corners stay inside the reveal mask */ bottom: 6%; background: var(--accent); transform-origin: 0 50%; transform: skewX(-8deg); }

      .ov-lower { left: 0; max-width: 1010px; }
      .ov-lower .slab { padding: 30px 50px 34px 70px; background: var(--paper); color: var(--ink); border-radius: 0 44px 44px 0;
        box-shadow: 0 30px 60px -25px rgba(0, 0, 0, 0.6); }
      .ov-lower .tag { display: inline-block; padding: 8px 20px; border-radius: 999px; background: var(--accent); color: var(--accent-text);
        font-size: 30px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
      .ov-lower .name { display: block; margin-top: 14px; line-height: 1.12; white-space: nowrap; }
      .ov-lower .meta { display: block; margin-top: 14px; font-size: 34px; font-weight: 600; opacity: 0.8; white-space: nowrap; }

      .ov-rating { left: 70px; display: flex; align-items: center; gap: 26px; padding: 22px 36px 22px 30px; border-radius: 999px;
        background: var(--paper); color: var(--ink); box-shadow: 0 24px 50px -20px rgba(0, 0, 0, 0.6); }
      .ov-rating .score { font-size: 96px; line-height: 1; }
      .ov-rating .stars { display: flex; gap: 6px; }
      .ov-rating .stars svg { display: block; }
      .ov-rating .stars path { fill: #ffb400; stroke: var(--ink); stroke-width: 2.5; stroke-linejoin: round; }
      .ov-rating .stars .off path { fill: transparent; }
      .ov-rating .src { margin-top: 6px; font-size: 30px; font-weight: 700; opacity: 0.75; white-space: nowrap; font-variant-numeric: tabular-nums; }

      .ov-stats { left: 60px; width: 620px; display: flex; flex-direction: column; gap: 26px; opacity: 1; }
      .ov-stats .stat { padding: 26px 32px 28px; border-radius: 30px; opacity: 0; background: rgba(12, 14, 16, 0.84); color: #fff;
        border-left: 12px solid var(--highlight); box-shadow: 0 30px 50px -28px rgba(0, 0, 0, 0.7); }
      .ov-stats .k { font-size: 28px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--highlight); }
      .ov-stats .v { display: flex; align-items: baseline; gap: 22px; margin-top: 18px; }
      .ov-stats .old { position: relative; font-size: 64px; line-height: 1.1; color: rgba(255, 255, 255, 0.55); }
      .ov-stats .old i { position: absolute; left: -6px; right: -6px; top: 52%; height: 8px; background: #ff5d4d; transform-origin: 0 50%; transform: rotate(-8deg) scaleX(0); }
      .ov-stats .arrow { font-size: 50px; color: var(--highlight); }
      .ov-stats .new { line-height: 1.1; white-space: nowrap; font-variant-numeric: tabular-nums; }

      .ov-check { left: 70px; right: 70px; padding: 40px 48px 46px 110px; background: var(--paper); color: var(--ink); border-radius: 18px;
        transform-origin: 50% 100%; box-shadow: 0 40px 70px -30px rgba(0, 0, 0, 0.7);
        background-image: repeating-linear-gradient(to bottom, transparent 0 101px, color-mix(in srgb, var(--ink) 16%, transparent) 101px 104px);
        background-position: 0 70px; }
      .ov-check::before { content: ""; position: absolute; left: 76px; top: 0; bottom: 0; width: 4px; background: rgba(255, 93, 77, 0.55); }
      .ov-check .head { font-size: 30px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.7; }
      .ov-check ul { list-style: none; margin-top: 24px; }
      .ov-check li { position: relative; display: flex; align-items: center; gap: 30px; height: 104px; font-weight: 700; white-space: nowrap; transform-origin: 0 50%; }
      .ov-check .box { position: relative; flex: none; width: 60px; height: 60px; border: 5px solid var(--ink); border-radius: 12px; }
      .ov-check .box svg { position: absolute; left: -8px; top: -22px; overflow: visible; }
      .ov-check .t { position: relative; padding: 0 8px; }
      .ov-check .t i { position: absolute; left: 0; right: 0; top: 8%; bottom: 4%; background: var(--accent); transform-origin: 0 50%; transform: scaleX(0); }
      .ov-check .t b { position: relative; font-weight: inherit; }

      .ov-circle { inset: 0; }
      .ov-circle .lbl { position: absolute; width: 640px; text-align: center; transform: rotate(-6deg); }
      .ov-circle .lbl span { display: inline-block; padding: 4px 26px 10px; border-radius: 999px; background: rgba(0, 0, 0, 0.62);
        font-family: "Fraunces", serif; font-style: italic; font-weight: 600; font-size: 58px; color: var(--highlight); white-space: nowrap; }

      .ov-stamp { left: 60px; padding: 18px 34px 14px; background: var(--accent); color: var(--accent-text); font-size: 104px; line-height: 1;
        border-radius: 12px; box-shadow: 0 20px 40px -18px rgba(0, 0, 0, 0.6); white-space: nowrap; }
      .ov-stamp small { display: block; margin-bottom: 6px; font-family: "Inter", sans-serif; font-size: 28px; font-weight: 800; letter-spacing: 0.1em; opacity: 0.75; }

      .ov-notes { left: 60px; right: 60px; height: 440px; opacity: 1; }
      .ov-notes .note { position: absolute; left: 0; right: 0; top: 0; display: flex; align-items: center; gap: 26px; opacity: 0;
        padding: 20px 28px; border-radius: 36px; background: rgba(251, 250, 246, 0.97); color: #111;
        box-shadow: 0 24px 50px -18px rgba(0, 0, 0, 0.55); transform-origin: 50% 0; }
      .ov-notes .ic { flex: none; display: grid; place-items: center; width: 84px; height: 84px; border-radius: 22px; font-size: 44px; font-weight: 800; color: #fff; }
      .ov-notes .tx { min-width: 0; }
      .ov-notes .app { display: block; font-size: 26px; font-weight: 600; color: #454d49; text-transform: uppercase; letter-spacing: 0.06em; }
      .ov-notes .msg { display: block; margin-top: 4px; font-size: 40px; font-weight: 700; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .ov-notes .when { margin-left: auto; align-self: flex-start; font-size: 26px; font-weight: 600; color: #454d49; }

      .ov-freeze { inset: 0; }
      .ov-freeze .scrim { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.55); opacity: 0; }
      .ov-freeze .pol { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; background: #fff; }
      .ov-freeze .pol img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      .ov-freeze .pcap { position: absolute; left: -34px; right: -34px; top: 100%; height: 190px; display: flex; align-items: center; justify-content: center;
        background: #fff; opacity: 0; }
      .ov-freeze .pcap span { font-family: "Fraunces", serif; font-style: italic; font-weight: 600; font-size: 84px; color: #1d1d1d; white-space: nowrap; }
      .ov-freeze .fl { position: absolute; inset: 0; background: #fff; opacity: 0; }

      /* Intro sits above everything, captions and hook included, until it wipes away. */
      .ov-intro { inset: 0; z-index: 8; background-color: var(--paper);
        background-image:
          linear-gradient(rgba(255, 255, 255, 0.07) 2px, transparent 2px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.07) 2px, transparent 2px),
          linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
        background-size: 216px 216px, 216px 216px, 54px 54px, 54px 54px; }
      .ov-intro svg { position: absolute; inset: 0; overflow: visible; }
      .ov-intro [data-draw] { fill: none; stroke: var(--ink); stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; }
      .ov-intro [data-draw].thin { stroke-width: 3; opacity: 0.7; }
      .ov-intro [data-draw].accent { stroke: var(--accent); stroke-width: 4; opacity: 0.85; }
      .ov-intro [data-label] { fill: var(--accent); font: 700 28px "JetBrains Mono", monospace; letter-spacing: 0.06em; text-transform: uppercase; }
      .ov-intro [data-label].dim { fill: var(--ink); opacity: 0.8; }
      .ov-intro .head { position: absolute; left: 120px; color: var(--ink); }
      .ov-intro .head small { display: block; font: 700 30px "JetBrains Mono", monospace; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); }
      .ov-intro .head b { display: block; margin-top: 18px; font: 400 150px/1.15 "Anton", sans-serif; text-transform: uppercase; letter-spacing: 0.01em; white-space: nowrap; }
      .ov-edge { position: absolute; left: 0; right: 0; top: 0; height: 26px; z-index: 9; background: var(--accent); opacity: 1;
        box-shadow: 0 0 40px color-mix(in srgb, var(--accent) 80%, transparent); }

      .ov-tour { left: 150px; right: 150px; height: 116px; display: flex; border-radius: 34px;
        background: color-mix(in srgb, var(--paper) 90%, transparent); box-shadow: 0 24px 50px -20px rgba(0, 0, 0, 0.6); }
      .ov-tour .track, .ov-tour .fill { position: absolute; top: 37px; height: 5px; border-radius: 3px; }
      .ov-tour .track { background: color-mix(in srgb, var(--ink) 30%, transparent); }
      .ov-tour .fill { background: var(--accent); transform-origin: 0 50%; }
      .ov-tour .stop { position: relative; flex: 1; padding-top: 24px; text-align: center; }
      .ov-tour .stop b { position: relative; z-index: 1; display: block; width: 32px; height: 32px; margin: 0 auto; border-radius: 50%;
        border: 5px solid color-mix(in srgb, var(--ink) 65%, transparent); background: var(--paper); }
      .ov-tour .stop span { display: block; margin-top: 12px; font: 800 26px/1 "Inter", sans-serif; letter-spacing: 0.1em; text-transform: uppercase;
        color: var(--ink); opacity: 0.7; white-space: nowrap; }`;

// @font-face rules for fonts the overlays ask edit.mjs to ship.
export const FONT_FACES = {
  "fraunces-italic.woff2": `@font-face { font-family: "Fraunces"; src: url("assets/fonts/fraunces-italic.woff2") format("woff2"); font-weight: 300 900; font-style: italic; }`,
  "jetbrains-mono.woff2": `@font-face { font-family: "JetBrains Mono"; src: url("assets/fonts/jetbrains-mono.woff2") format("woff2"); font-weight: 100 800; }`,
};

/**
 * @returns {{ html: string[], tl: string[], init: string[], fonts: Set<string>, usesFmt: boolean, problems: string[] }}
 */
// still(at) returns { src, grade } for a frame of the cut at that time (freeze needs it);
// readJobFile(name) returns a file from the job folder as text (intro drawings).
export function buildOverlays(list, { cutEnd, captions, hook, esc, round, still, readJobFile, brand }) {
  // GSAP can only tween real colours, not var() or color-mix(), so tweens use the brand hexes.
  const rgba = (hex, a) => { const h = hex.replace("#", ""); const v = (i) => parseInt(h.length === 3 ? h[i] + h[i] : h.slice(i * 2, i * 2 + 2), 16); return `rgba(${v(0)}, ${v(1)}, ${v(2)}, ${a})`; };
  const html = [];
  const tl = [];
  const init = [];
  const fonts = new Set();
  const problems = [];
  let usesFmt = false;
  const boxes = [];

  const at = (n) => round(Math.max(0, n));
  const from = (target, a, b, t) => tl.push(`tl.fromTo(${JSON.stringify(target)}, ${JSON.stringify(a)}, ${JSON.stringify({ ...b, immediateRender: false })}, ${at(t)});`);
  const count = (id, o, t, duration) => {
    usesFmt = true;
    const d = decimalsOf(o.to);
    const v = `n_${id}`;
    tl.push(
      `const ${v} = { v: ${Number(o.from ?? 0)} }; tl.fromTo(${v}, { v: ${Number(o.from ?? 0)} }, { v: ${Number(o.to)}, duration: ${duration}, ease: "power2.out", immediateRender: false, ` +
        `onUpdate: () => (document.getElementById(${JSON.stringify(id)}).textContent = fmt(${v}.v, ${d}, ${JSON.stringify(o.prefix ?? "")}, ${JSON.stringify(o.suffix ?? "")})) }, ${at(t)});`,
    );
    return fmt(o.from ?? 0, d, o.prefix, o.suffix);
  };
  const need = (o, key, where) => {
    if (o[key] === undefined || o[key] === null || o[key] === "") throw new Error(`${where}: "${key}" is required.`);
  };
  const needList = (o, where, max) => {
    if (!Array.isArray(o.items) || !o.items.length) throw new Error(`${where}: "items" must be a non-empty list.`);
    if (o.items.length > max) throw new Error(`${where}: at most ${max} items fit.`);
  };

  // Freeze photos cover the middle of the frame; the tour tracker steps aside for them.
  const freezes = (list ?? []).filter((o) => o.type === "freeze").map((o) => ({ start: Number(o.at), end: Number(o.at) + (o.duration ?? 2.0) }));

  for (const [n, o] of (list ?? []).entries()) {
    const where = `Overlay ${n + 1} (${o.type})`;
    const id = `o${n}`;
    need(o, "at", where);
    const t = Number(o.at);
    let dur, top, bottom;
    let fullFrame = false;

    switch (o.type) {
      case "title": {
        const lines = Array.isArray(o.lines) ? o.lines : [o.text];
        if (!lines.length || lines.length > 2 || !lines.every(Boolean)) throw new Error(`${where}: "lines" needs one or two lines of text.`);
        const marked = o.highlight !== false;
        dur = o.duration ?? 2.2;
        top = o.y ?? 300;
        const sizes = lines.map((l, i) => fit(l, i === lines.length - 1 && marked ? 180 : 140, i === lines.length - 1 && marked ? 900 : 950, 0.5));
        bottom = top + sizes.reduce((s, px) => s + px * 1.1, 0);
        html.push(
          `<div id="${id}" class="ov ov-title" style="top: ${top}px">` +
            lines.map((l, i) => i === lines.length - 1 && marked
              ? `<span class="l mark"><i id="${id}hl"></i><span class="anton" id="${id}l${i}" style="font-size: ${sizes[i]}px">${esc(l)}</span></span>`
              : `<span class="l"><span class="anton" id="${id}l${i}" style="font-size: ${sizes[i]}px">${esc(l)}</span></span>`).join("") +
            `</div>`,
        );
        init.push(`gsap.set(${JSON.stringify(lines.map((_, i) => `#${id}l${i}`))}, { yPercent: 110 });`);
        if (marked) init.push(`gsap.set("#${id}hl", { scaleX: 0 });`);
        from(`#${id}`, { opacity: 0 }, { opacity: 1, duration: 0.01 }, t);
        lines.forEach((_, i) => from(`#${id}l${i}`, { yPercent: 110 }, { yPercent: 0, duration: 0.45, ease: "expo.out" }, t + i * 0.22));
        if (marked) from(`#${id}hl`, { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: "power3.inOut" }, t + 0.22 * (lines.length - 1) + 0.17);
        from(`#${id}`, { opacity: 1, y: 0 }, { opacity: 0, y: -50, duration: 0.22, ease: "power2.in" }, t + dur - 0.22);
        break;
      }

      case "lowerThird": {
        need(o, "name", where);
        dur = o.duration ?? 2.6;
        top = o.y ?? 780;
        const size = fit(o.name, 120, 880, 0.48);
        bottom = top + 100 + size * 1.12 + (o.tag ? 60 : 0) + (o.meta ? 60 : 0);
        html.push(
          `<div id="${id}" class="ov ov-lower" style="top: ${top}px"><div class="slab">` +
            (o.tag ? `<span class="tag">${esc(o.tag)}</span>` : "") +
            `<span class="name anton" style="font-size: ${size}px">${esc(o.name)}</span>` +
            (o.meta ? `<span class="meta">${esc(o.meta)}</span>` : "") +
            `</div></div>`,
        );
        from(`#${id}`, { opacity: 0, x: -1010 }, { opacity: 1, x: 0, duration: 0.45, ease: "expo.out" }, t);
        from(`#${id}`, { x: 0 }, { x: -1010, duration: 0.3, ease: "power3.in" }, t + dur - 0.3);
        from(`#${id}`, { opacity: 1 }, { opacity: 0, duration: 0.01 }, t + dur);
        break;
      }

      case "rating": {
        need(o, "score", where);
        dur = o.duration ?? 2.6;
        top = o.y ?? 150;
        bottom = top + 150;
        const score = Number(o.score);
        const whole = Math.round(score);
        const countText = o.count != null ? count(`${id}c`, { to: o.count }, t + 0.35, 0.8) : null;
        const src = [countText !== null ? `<span id="${id}c">${countText}</span>` : null, esc(o.source ?? ""), o.count != null ? "reviews" : null].filter(Boolean).join(" ");
        html.push(
          `<div id="${id}" class="ov ov-rating" style="top: ${top}px">` +
            `<span class="score anton">${esc(score.toFixed(decimalsOf(o.score) || 1))}</span>` +
            `<span><span class="stars">${[0, 1, 2, 3, 4].map((k) => `<svg id="${id}s${k}"${k >= whole ? ' class="off"' : ""} width="46" height="46" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" /></svg>`).join("")}</span>` +
            (src ? `<span class="src">${src}</span>` : "") +
            `</span></div>`,
        );
        from(`#${id}`, { opacity: 0, scale: 0.7, y: -30 }, { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "back.out(2)" }, t);
        [0, 1, 2, 3, 4].forEach((k) => from(`#${id}s${k}`, { scale: 0 }, { scale: 1, duration: 0.25, ease: "back.out(3)" }, t + 0.25 + k * 0.07));
        from(`#${id}`, { opacity: 1, y: 0 }, { opacity: 0, y: -40, duration: 0.22, ease: "power2.in" }, t + dur - 0.22);
        break;
      }

      case "stats": {
        needList(o, where, 3);
        o.items.forEach((s, k) => {
          need(s, "label", `${where} item ${k + 1}`);
          need(s, "to", `${where} item ${k + 1}`);
        });
        dur = o.duration ?? 1.4 + o.items.length * 0.5;
        top = o.y ?? 360;
        bottom = top + o.items.length * 240;
        const cards = o.items.map((s, k) => {
          const sid = `${id}n${k}`;
          const t0 = t + 0.3 + k * 0.24;
          const finalText = fmt(s.to, decimalsOf(s.to), s.prefix, s.suffix);
          const size = fit(finalText, 116, s.was != null ? 330 : 520, 0.5);
          if (s.was != null) tl.push(`tl.to("#${id}k${k} .old i", { scaleX: 1, duration: 0.2, ease: "power2.out" }, ${at(t0)});`);
          const startText = count(sid, { ...s, from: s.from ?? s.was ?? 0 }, t0 + 0.05, 0.9);
          return (
            `<div class="stat" id="${id}k${k}"><div class="k">${esc(s.label)}</div><div class="v">` +
            (s.was != null ? `<span class="old anton">${esc(fmt(s.was, decimalsOf(s.was), s.prefix, s.suffix))}<i></i></span><span class="arrow anton">&rarr;</span>` : "") +
            `<span class="new anton" id="${sid}" style="font-size: ${size}px">${esc(startText)}</span></div></div>`
          );
        });
        html.push(`<div id="${id}" class="ov ov-stats" style="top: ${top}px">${cards.join("")}</div>`);
        o.items.forEach((_, k) => {
          from(`#${id}k${k}`, { opacity: 0, x: -140 }, { opacity: 1, x: 0, duration: 0.4, ease: "expo.out" }, t + k * 0.24);
          from(`#${id}k${k}`, { opacity: 1, x: 0 }, { opacity: 0, x: -120, duration: 0.25, ease: "power2.in" }, t + dur - 0.3 + k * 0.06);
        });
        break;
      }

      case "checklist": {
        needList(o, where, 5);
        const marked = o.highlight !== false;
        dur = o.duration ?? 1.4 + o.items.length * 0.38 + 0.9;
        top = o.y ?? 180;
        bottom = top + 150 + o.items.length * 104 + (o.title ? 40 : 0);
        const size = Math.min(...o.items.map((it) => fit(it, 54, 700, 0.56)));
        html.push(
          `<div id="${id}" class="ov ov-check" style="top: ${top}px">` +
            (o.title ? `<div class="head">${esc(o.title)}</div>` : "") +
            `<ul>${o.items.map((it, k) => {
              const last = marked && k === o.items.length - 1;
              return (
                `<li id="${id}i${k}" style="font-size: ${size}px"><span class="box"><svg width="80" height="80" viewBox="0 0 80 80">` +
                `<path id="${id}c${k}" d="M 12 44 L 32 64 L 76 8" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="100" stroke-dashoffset="100" /></svg></span>` +
                `<span class="t"${last ? ` id="${id}t"` : ""}>${last ? `<i id="${id}hl"></i>` : ""}<b>${esc(it)}</b></span></li>`
              );
            }).join("")}</ul></div>`,
        );
        from(`#${id}`, { opacity: 0, y: 200, rotation: 4 }, { opacity: 1, y: 0, rotation: -2, duration: 0.45, ease: "back.out(1.4)" }, t);
        o.items.forEach((_, k) => {
          const tk = t + 0.4 + k * 0.38;
          from(`#${id}c${k}`, { attr: { "stroke-dashoffset": 100 } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.22, ease: "power2.out" }, tk);
          from(`#${id}i${k}`, { scale: 1 }, { keyframes: [{ scale: 1.04, duration: 0.08 }, { scale: 1, duration: 0.14 }] }, tk + 0.05);
        });
        if (marked) {
          // The marked item's text only switches to accent-text once the marker is under it.
          const tm = t + 0.4 + o.items.length * 0.38;
          init.push(`gsap.set("#${id}t", { color: "var(--ink)" });`);
          from(`#${id}hl`, { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "power3.inOut" }, tm);
          tl.push(`tl.set("#${id}t", { color: "var(--accent-text)" }, ${at(tm + 0.12)});`);
        }
        from(`#${id}`, { opacity: 1, y: 0, rotation: -2 }, { opacity: 0, y: -260, rotation: -8, duration: 0.3, ease: "power3.in" }, t + dur - 0.3);
        break;
      }

      case "circle": {
        need(o, "x", where);
        need(o, "y", where);
        const rx = o.rx ?? 170;
        const ry = o.ry ?? 210;
        dur = o.duration ?? 1.8;
        top = o.y - ry - (o.label ? 110 : 20);
        bottom = o.y + ry + 20;
        const ring = ringPath(o.x, o.y, rx, ry);
        const lx = Math.min(1080 - 660, Math.max(20, o.x - 320));
        html.push(
          `<div id="${id}" class="ov ov-circle"><svg viewBox="0 0 1080 1920" width="1080" height="1920" aria-hidden="true">` +
            `<path id="${id}p" d="${ring.d}" fill="none" stroke-width="11" stroke-linecap="round" stroke-dasharray="${ring.len}" stroke-dashoffset="${ring.len}" style="stroke: var(--highlight); filter: drop-shadow(0 4px 10px rgba(0,0,0,0.45))" /></svg>` +
            (o.label ? `<div id="${id}l" class="lbl" style="left: ${lx}px; top: ${round(o.y - ry - 100)}px"><span>${esc(o.label)}</span></div>` : "") +
            `</div>`,
        );
        from(`#${id}`, { opacity: 0 }, { opacity: 1, duration: 0.01 }, t);
        from(`#${id}p`, { attr: { "stroke-dashoffset": ring.len } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.5, ease: "power2.inOut" }, t);
        if (o.label) from(`#${id}l`, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, t + 0.45);
        from(`#${id}`, { opacity: 1 }, { opacity: 0, duration: 0.2 }, t + dur - 0.2);
        break;
      }

      case "stamp": {
        need(o, "text", where);
        dur = o.duration ?? 2;
        top = o.y ?? 120;
        bottom = top + 150 + (o.small ? 40 : 0);
        html.push(`<div id="${id}" class="ov ov-stamp anton" style="top: ${top}px; font-size: ${fit(o.text, 104, 880, 0.5)}px">${o.small ? `<small>${esc(o.small)}</small>` : ""}${esc(o.text)}</div>`);
        from(`#${id}`, { opacity: 0, scale: 1.8, rotation: -14 }, { opacity: 1, scale: 1, rotation: -4, duration: 0.35, ease: "back.out(2.2)" }, t);
        from(`#${id}`, { opacity: 1, y: 0 }, { opacity: 0, y: -40, duration: 0.2 }, t + dur - 0.2);
        break;
      }

      case "notifications": {
        needList(o, where, 5);
        o.items.forEach((it, k) => need(it, "msg", `${where} item ${k + 1}`));
        const gap = 0.34; // longer than the 0.3s drop, so a card has landed before the next pushes it
        dur = o.duration ?? 0.6 + o.items.length * gap + 1.4;
        top = o.y ?? 170;
        bottom = top + 440;
        // Newest on top; older ones get pushed down, shrink and fade.
        html.push(
          `<div id="${id}" class="ov ov-notes" style="top: ${top}px">` +
            o.items.map((it, k) => {
              const color = it.color ?? NOTE_COLORS[k % NOTE_COLORS.length];
              const icon = it.icon ?? (it.app ? it.app[0].toUpperCase() : "!");
              return `<div class="note" id="${id}m${k}" data-layout-allow-overlap><span class="ic" style="background: ${esc(color)}">${esc(icon)}</span><span class="tx">${it.app ? `<span class="app">${esc(it.app)}</span>` : ""}<span class="msg">${esc(it.msg)}</span></span><span class="when">${esc(it.when ?? "now")}</span></div>`;
            }).join("") +
            `</div>`,
        );
        o.items.forEach((_, k) => {
          const tk = t + k * gap;
          from(`#${id}m${k}`, { opacity: 0, y: -160, scale: 1 }, { opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.6)" }, tk);
          for (let j = 0; j < k; j++) {
            const depth = k - j;
            const prev = Math.max(0, depth - 1);
            const pos = (d) => ({ y: [0, 112, 212, 300][Math.min(d, 3)], scale: round(1 - 0.04 * d), opacity: d > 3 ? 0 : round(1 - 0.08 * d) });
            from(`#${id}m${j}`, pos(prev), { ...pos(depth), duration: 0.28, ease: "power3.out" }, tk);
          }
        });
        o.items.forEach((_, k) => from(`#${id}m${k}`, { x: 0 }, { x: -1200, duration: 0.3, ease: "power3.in" }, t + dur - 0.35 + (o.items.length - 1 - k) * 0.03));
        from(`#${id}`, { opacity: 1 }, { opacity: 0, duration: 0.01 }, t + dur);
        break;
      }

      case "freeze": {
        // The frame under "at" flashes, freezes, and shrinks into a tilted photo over the
        // darkened footage, which keeps playing behind it. Then the photo flies off.
        // Small enough and lifted enough that photo + caption clear the platform UI at the bottom.
        const scale = o.scale ?? 0.56;
        const lift = -120;
        dur = o.duration ?? 2.0;
        top = 960 + lift - 960 * scale;
        bottom = 960 + lift + 960 * scale + (o.caption ? 190 * scale : 0);
        const frame = still(t);
        const shadow = (spread, a) => `0 0 0 ${spread}px #fff, 0 50px 90px rgba(0, 0, 0, ${a})`;
        html.push(
          `<div id="${id}" class="ov ov-freeze"><div class="scrim" id="${id}s"></div>` +
            `<div class="pol" id="${id}p"><img src="${frame.src}" alt=""${frame.grade ? ` data-color-grading="${esc(JSON.stringify(frame.grade))}"` : ""} />` +
            (o.caption ? `<div class="pcap" id="${id}c" data-layout-allow-overflow><span>${esc(o.caption)}</span></div>` : "") +
            `</div><div class="fl" id="${id}f"></div></div>`,
        );
        from(`#${id}`, { opacity: 0 }, { opacity: 1, duration: 0.01 }, t);
        from(`#${id}f`, { opacity: 0 }, { keyframes: [{ opacity: 1, duration: 0.04 }, { opacity: 0, duration: 0.35, ease: "power2.out" }] }, t);
        from(`#${id}p`, { scale: 1, rotation: 0, y: 0, boxShadow: shadow(0, 0) }, { scale, rotation: -4, y: lift, boxShadow: shadow(34, 0.55), duration: 0.5, ease: "power3.inOut" }, t + 0.3);
        from(`#${id}s`, { opacity: 0 }, { opacity: 1, duration: 0.4 }, t + 0.3);
        if (o.caption) from(`#${id}c`, { opacity: 0 }, { opacity: 1, duration: 0.25 }, t + 0.6);
        from(`#${id}p`, { y: lift, rotation: -4 }, { y: -1600, rotation: -14, duration: 0.4, ease: "power3.in" }, t + dur - 0.4);
        from(`#${id}s`, { opacity: 1 }, { opacity: 0, duration: 0.3 }, t + dur - 0.3);
        from(`#${id}`, { opacity: 1 }, { opacity: 0, duration: 0.01 }, t + dur);
        break;
      }

      case "intro": {
        // Brand grid with a kicker and one big word; an optional drawing strokes itself in; then a
        // glowing accent edge wipes the whole card upward to reveal the footage.
        need(o, "word", where);
        fonts.add("jetbrains-mono.woff2");
        fullFrame = true;
        dur = o.duration ?? 1.4;
        top = 0;
        bottom = 1920;
        const wipeAt = t + dur - 0.45;
        let drawing = "";
        if (o.drawing) {
          // Tag every shape to draw itself and every <text> as a label; shapes keep their own classes (thin, accent).
          drawing = readJobFile(o.drawing)
            .replace(/<\/?svg[^>]*>/g, "")
            .replace(/<!--[\s\S]*?-->/g, "")
            .replace(/<(path|rect|circle|ellipse|line|polyline|polygon)\b/g, '<$1 pathLength="1" data-draw')
            .replace(/<text\b/g, "<text data-label")
            .trim();
        }
        html.push(
          `<div id="${id}" class="ov ov-intro" style="opacity: 1">` +
            `<div class="head" id="${id}h" style="top: ${o.y ?? 300}px"><small data-layout-allow-overlap>${esc(o.kicker ?? "")}</small><b data-layout-allow-overlap style="font-size: ${fit(o.word, 150, 840, 0.5)}px">${esc(o.word)}</b></div>` +
            (drawing ? `<svg viewBox="0 0 1080 1920" width="1080" height="1920" aria-hidden="true">${drawing}</svg>` : "") +
            `</div><i id="${id}e" class="ov-edge"></i>`,
        );
        init.push(
          `gsap.set("#${id} [data-draw]", { attr: { "stroke-dasharray": 1, "stroke-dashoffset": 1 } });`,
          `gsap.set("#${id} [data-label]", { opacity: 0 });`,
          `gsap.set("#${id}e", { y: 2000 });`,
        );
        const drawWindow = Math.max(0.3, wipeAt - t - 0.5);
        tl.push(`gsap.utils.toArray("#${id} [data-draw]").forEach((el, i, all) => tl.fromTo(el, { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.42, ease: "power2.inOut", immediateRender: false }, ${at(t + 0.05)} + i * ${round(drawWindow)} / Math.max(1, all.length)));`);
        tl.push(`tl.fromTo("#${id} [data-label]", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.2, stagger: 0.04, immediateRender: false }, ${at(t + 0.45)});`);
        from(`#${id}h`, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.3, ease: "power3.out" }, t + 0.05);
        from(`#${id}`, { clipPath: "inset(0% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.42, ease: "power3.inOut" }, wipeAt);
        // The edge parks off-frame below before the wipe and above after it, so it needs no opacity.
        from(`#${id}e`, { y: 2000 }, { y: -80, duration: 0.42, ease: "power3.inOut" }, wipeAt);
        if (hook && hook.end > t && t + dur > 0) problems.push(`${where} covers the hook box; start the hook after the intro or drop it.`);
        break;
      }

      case "tour": {
        // Stops light up in order and the line fills between them. Hidden while a freeze photo is up.
        if (!Array.isArray(o.stops) || o.stops.length < 2 || o.stops.length > 4) throw new Error(`${where}: "stops" needs 2 to 4 { label, at } entries.`);
        o.stops.forEach((st, k) => {
          need(st, "label", `${where} stop ${k + 1}`);
          need(st, "at", `${where} stop ${k + 1}`);
          if (k && st.at <= o.stops[k - 1].at) throw new Error(`${where}: stop times must increase.`);
        });
        const n = o.stops.length;
        dur = o.duration ?? round(cutEnd - t - 0.05);
        // Above the captions when there are captions; otherwise just above the platform UI.
        top = o.y ?? (captions ? 190 : 1330);
        bottom = top + 116;
        const edge = `${round(50 / n)}%`;
        html.push(
          `<div id="${id}" class="ov ov-tour" style="top: ${top}px">` +
            `<i class="track" style="left: ${edge}; right: ${edge}"></i><i class="fill" id="${id}f" style="left: ${edge}; right: ${edge}"></i>` +
            o.stops.map((st, k) => `<div class="stop" id="${id}s${k}"><b></b><span>${esc(st.label)}</span></div>`).join("") +
            `</div>`,
        );
        init.push(`gsap.set("#${id}", { opacity: 0, y: 40 });`, `gsap.set("#${id}f", { scaleX: 0 });`);
        from(`#${id}`, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, t);
        o.stops.forEach((st, k) => {
          const ts = Number(st.at);
          if (k) tl.push(`tl.to("#${id}f", { scaleX: ${round(k / (n - 1))}, duration: 0.4, ease: "power2.inOut" }, ${at(ts - 0.3)});`);
          from(`#${id}s${k} b`, { backgroundColor: brand.paper, borderColor: rgba(brand.ink, 0.65) }, { backgroundColor: brand.accent, borderColor: brand.accent, duration: 0.15 }, ts);
          from(`#${id}s${k} b`, { scale: 1 }, { keyframes: [{ scale: 1.45, duration: 0.12 }, { scale: 1, duration: 0.2 }] }, ts);
          from(`#${id}s${k} span`, { opacity: 0.7 }, { opacity: 1, duration: 0.15 }, ts);
        });
        for (const f of freezes) {
          if (f.start < t + dur && f.end > t) {
            tl.push(`tl.to("#${id}", { opacity: 0, duration: 0.2 }, ${at(f.start - 0.1)});`, `tl.to("#${id}", { opacity: 1, duration: 0.25 }, ${at(f.end + 0.05)});`);
          }
        }
        tl.push(`tl.to("#${id}", { opacity: 0, duration: 0.25 }, ${at(t + dur - 0.25)});`);
        break;
      }

      default:
        throw new Error(`${where}: unknown overlay type. Use one of: title, lowerThird, rating, stats, checklist, circle, stamp, notifications, freeze, intro, tour.`);
    }

    // Layout checks: off the end of the cut, under the captions or platform UI, or on top of another overlay.
    const end = t + dur;
    if (end > cutEnd + 0.01) problems.push(`${where} runs to ${end.toFixed(1)}s, past the end of the cut (${cutEnd.toFixed(1)}s).`);
    if (!fullFrame && captions && bottom > CAPTION_BAND[0] && top < CAPTION_BAND[1]) problems.push(`${where} sits in the caption band (${Math.round(top)}-${Math.round(bottom)}px). Move it with "y".`);
    if (!fullFrame && bottom > PLATFORM_UI) problems.push(`${where} reaches ${Math.round(bottom)}px; TikTok/Reels UI covers below ~${PLATFORM_UI}px.`);
    if (hook && t < hook.end && top < hook.bottom && bottom > hook.top) problems.push(`${where} overlaps the hook box while it's on screen.`);
    for (const b of boxes) {
      // The tour hides itself for freeze photos, so those two never actually meet.
      if ([b.type, o.type].sort().join("+") === "freeze+tour") continue;
      if (t < b.end && b.start < end && top < b.bottom && b.top < bottom) problems.push(`${where} overlaps ${b.where} on screen.`);
    }
    boxes.push({ where, type: o.type, start: t, end, top, bottom });
  }

  // OVERLAY_CSS names Fraunces (circle labels), so ship the font whenever overlays are on the page.
  if (html.length) fonts.add("fraunces-italic.woff2");
  return { html, tl, init, fonts, usesFmt, problems };
}

export const FMT_SOURCE = `const fmt = ${fmt.toString()};`;
