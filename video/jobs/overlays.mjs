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
//     { "type": "notifications", "at": 0.1, "items": [{ "app": "Phone", "msg": "3 missed calls" }, { "app": "Mail", "msg": "86 unread" }] }
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
      .ov-title .mark i { position: absolute; left: 0; right: 0; top: 16%; bottom: 6%; background: var(--accent); transform-origin: 0 50%; transform: skewX(-8deg); }

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
      .ov-notes .when { margin-left: auto; align-self: flex-start; font-size: 26px; font-weight: 600; color: #454d49; }`;

/**
 * @returns {{ html: string[], tl: string[], init: string[], fonts: Set<string>, usesFmt: boolean, problems: string[] }}
 */
export function buildOverlays(list, { cutEnd, captions, hook, esc, round }) {
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

  for (const [n, o] of (list ?? []).entries()) {
    const where = `Overlay ${n + 1} (${o.type})`;
    const id = `o${n}`;
    need(o, "at", where);
    const t = Number(o.at);
    let dur, top, bottom;

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
        fonts.add("fraunces-italic.woff2");
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

      default:
        throw new Error(`${where}: unknown overlay type. Use one of: title, lowerThird, rating, stats, checklist, circle, stamp, notifications.`);
    }

    // Layout checks: off the end of the cut, under the captions or platform UI, or on top of another overlay.
    const end = t + dur;
    if (end > cutEnd + 0.01) problems.push(`${where} runs to ${end.toFixed(1)}s, past the end of the cut (${cutEnd.toFixed(1)}s).`);
    if (captions && bottom > CAPTION_BAND[0] && top < CAPTION_BAND[1]) problems.push(`${where} sits in the caption band (${Math.round(top)}-${Math.round(bottom)}px). Move it with "y".`);
    if (bottom > PLATFORM_UI) problems.push(`${where} reaches ${Math.round(bottom)}px; TikTok/Reels UI covers below ~${PLATFORM_UI}px.`);
    if (hook && t < hook.end && top < hook.bottom && bottom > hook.top) problems.push(`${where} overlaps the hook box while it's on screen.`);
    for (const b of boxes) {
      if (t < b.end && b.start < end && top < b.bottom && b.top < bottom) problems.push(`${where} overlaps ${b.where} on screen.`);
    }
    boxes.push({ where, start: t, end, top, bottom });
  }

  return { html, tl, init, fonts, usesFmt, problems };
}

export const FMT_SOURCE = `const fmt = ${fmt.toString()};`;
