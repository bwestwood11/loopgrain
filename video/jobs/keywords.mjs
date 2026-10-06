// Keyword captions for talking-head edits (STYLE.md, "Talking-head reference"). Instead of
// subtitling every word, the words that carry the pitch slam in big, glowing and wide, and
// hold while the rest of the sentence runs underneath as a small white italic line.
//
//   "captions": {
//     "mode": "keywords",
//     "y": 1250,                         // bottom edge of the keyword block (default 1250)
//     "keys": [
//       { "at": 0.8, "until": 2.2, "lines": ["Just finished"] },
//       { "at": 2.28, "until": 4.3, "lines": ["Full track pack", { "text": "PPF", "at": 3.12, "big": true }] }
//     ]
//   }
//
// Times are seconds on the cut's timeline. A line is a string or { text, at, big, sfx }. A line
// without "at" lands with the key; later lines land at their own "at" (time them to the word).
// Each line steps right of the one above it (the staircase). Spoken words that are part of the
// keyword on screen are left out of the small line. Segments with "captions": false (B-roll with
// music, say) get no small line. Sound effects: a whoosh into each key, a swish on each later
// line, a ding on big lines and a cash register on big lines about money ("$", "price", "save"...);
// set a line's "sfx" to "whoosh", "swish", "hit" (the ding), "cash" or null to change it.

const BLOCK_WIDTH = 960;
const STEP = 64; // staircase offset per line, px
const EM_PER_CHAR = 0.9; // Unbounded ExtraBold caps run wide
const SIZE = { normal: 100, big: 190 };

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const MONEY = /\$|\b(cash|money|price[sd]?|pay|paid|save[sd]?|savings?|deals?|sales?|sold|profits?|revenue|earn(ed|ings)?|cheap(er|est)?|cost)\b/i;
const sameWord = (a, b) => a === b || (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a)));

export const KEYWORD_FONT = "unbounded-800.woff2";

export function buildKeywords(words, cfg, { esc, round, cutEnd, timeline, accent }) {
  const problems = [];
  const y = cfg.y ?? 1250;
  if (y > 1500) problems.push(`captions.y is ${y}: the keywords would sit under the platform UI (keep it at 1500 or less).`);

  const keys = (cfg.keys ?? []).map((k, i) => {
    const where = `Keyword ${i + 1}`;
    if (!(k.until > k.at)) throw new Error(`${where}: "until" must be after "at".`);
    if (k.until > cutEnd + 0.01) problems.push(`${where} runs past the end of the cut (${cutEnd}s).`);
    const lines = (k.lines ?? []).map((l, j) => {
      const line = typeof l === "string" ? { text: l } : { ...l };
      line.at = line.at ?? k.at;
      if (line.at < k.at || line.at >= k.until) problems.push(`${where}, line ${j + 1} lands outside its key (${k.at}-${k.until}s).`);
      const off = j * STEP;
      line.size = Math.round(Math.min(line.big ? SIZE.big : SIZE.normal, (BLOCK_WIDTH - off) / (EM_PER_CHAR * Math.max(1, line.text.length))));
      line.off = off;
      line.sfx = "sfx" in line ? line.sfx : line.big ? (MONEY.test(line.text) ? "cash" : "hit") : j === 0 ? "whoosh" : "swish";
      return line;
    });
    if (!lines.length) throw new Error(`${where} has no lines.`);
    const prev = cfg.keys[i - 1];
    if (prev && k.at < prev.until) problems.push(`${where} starts before keyword ${i} ends.`);
    return { ...k, lines, tokens: lines.flatMap((l) => l.text.split(/\s+/).map(norm)).filter(Boolean) };
  });

  // The small line: what's said, minus the words the keyword on screen already shows.
  const hidden = (w) => {
    const key = keys.find((k) => w.start >= k.at - 0.3 && w.start < k.until);
    return key && key.tokens.some((t) => sameWord(t, norm(w.text)));
  };
  const groups = [];
  let g = null;
  for (const w of words) {
    if (timeline[w.seg].captions === false) continue;
    // A hidden word ends the line, so "we [wrapped] and [tuck] all" doesn't read as "we and all".
    if (hidden(w)) {
      g = null;
      continue;
    }
    const prev = g?.words.at(-1);
    const chars = g ? g.words.reduce((n, x) => n + x.text.length + 1, 0) : 0;
    if (!g || w.seg !== prev.seg || g.words.length >= 3 || chars + w.text.length > 16 || w.start - prev.end > 0.35 || /[.!?,;:]$/.test(prev.text)) {
      groups.push((g = { words: [] }));
    }
    g.words.push(w);
  }
  for (const [i, grp] of groups.entries()) {
    const seg = timeline[grp.words[0].seg];
    grp.start = grp.words[0].start;
    grp.end = round(Math.min(groups[i + 1]?.words[0].start ?? Infinity, grp.words.at(-1).end + 0.35, seg.start + seg.duration));
  }

  const html = [
    ...keys.map((k, i) =>
      `<div id="kw${i}" class="kw" data-layout-allow-overflow><div class="kwb">` +
      k.lines.map((l, j) => `<div id="kw${i}_${j}" class="kl" style="font-size: ${l.size}px; margin-left: ${l.off}px"><span>${esc(l.text)}</span></div>`).join("") +
      `</div></div>`,
    ),
    ...groups.map((grp, i) => `<div id="kf${i}" class="kf">${esc(grp.words.map((w) => w.text.trim()).join(" "))}</div>`),
  ];

  const tl = [];
  const sfx = [];
  const at = (n) => round(Math.max(0, n));
  for (const [i, k] of keys.entries()) {
    tl.push(`tl.set("#kw${i}", { opacity: 1 }, ${at(k.at)});`);
    for (const [j, l] of k.lines.entries()) {
      // Punch in from the left with motion blur and a little overshoot.
      tl.push(`tl.fromTo("#kw${i}_${j}", { opacity: 0, x: -90, scaleX: 1.35, filter: "blur(16px)" }, { opacity: 1, x: 0, scaleX: 1, filter: "blur(0px)", duration: 0.24, ease: "back.out(1.7)", immediateRender: false }, ${at(l.at)});`);
      if (l.big) tl.push(`tl.fromTo("#kw${i}_${j}", { scale: 1 }, { keyframes: [{ scale: 1.08, duration: 0.08 }, { scale: 1, duration: 0.2, ease: "power2.out" }], immediateRender: false }, ${at(l.at + 0.2)});`);
      if (l.sfx) sfx.push({ name: l.sfx, at: l.at });
    }
    // Leave with a sideways smear, not a fade.
    const out = Math.max(k.at + 0.3, k.until - 0.16);
    tl.push(`tl.fromTo("#kw${i}", { x: 0, scaleX: 1, filter: "blur(0px)", opacity: 1 }, { x: 160, scaleX: 1.5, filter: "blur(18px)", opacity: 0, duration: ${round(k.until - out)}, ease: "power2.in", immediateRender: false }, ${at(out)});`);
  }
  for (const [i, grp] of groups.entries()) {
    tl.push(`tl.fromTo("#kf${i}", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.1, ease: "power2.out", immediateRender: false }, ${at(grp.start)});`);
    tl.push(`tl.set("#kf${i}", { opacity: 0 }, ${at(grp.end)});`);
  }

  const glow = (a) => accent.replace(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i, (_, r, g2, b) => `rgba(${parseInt(r, 16)}, ${parseInt(g2, 16)}, ${parseInt(b, 16)}, ${a})`);
  const css = `
      /* Keyword captions: the pitch words big and glowing, the rest as a small line underneath. */
      .kw { position: absolute; left: 0; right: 0; bottom: ${1920 - y}px; display: flex; justify-content: center; opacity: 0; transform-origin: 50% 100%; }
      .kwb { display: inline-block; text-align: left; }
      .kl { white-space: nowrap; line-height: 1.04; opacity: 0; transform-origin: 0 60%;
        font-family: "Unbounded", sans-serif; font-weight: 800; text-transform: uppercase; letter-spacing: -0.01em; color: var(--accent);
        -webkit-text-stroke: 0.06em rgba(8, 4, 6, 0.9); paint-order: stroke fill;
        text-shadow: 0 0 4px ${glow(0.95)}, 0 0 26px ${glow(0.75)}, 0 0 60px ${glow(0.4)}, 0 8px 26px rgba(0, 0, 0, 0.55); }
      .kl span { display: inline-block; transform: skewX(-9deg); }
      .kf { position: absolute; left: 60px; right: 60px; top: ${y + 18}px; text-align: center; opacity: 0;
        font-family: "Inter", sans-serif; font-style: italic; font-weight: 500; font-size: 50px; color: #fff;
        -webkit-text-stroke: 6px rgba(0, 0, 0, 0.75); paint-order: stroke fill; text-shadow: 0 4px 22px rgba(0, 0, 0, 0.6); }`;

  return { html, tl, css, sfx, problems, count: keys.length, smallLines: groups.length };
}
