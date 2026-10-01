// extra.html: hand-written additions to one job's edit, for animation that edit.json and
// overlays.mjs can't express. edit.mjs folds it into edit/index.html on every build:
//   <style> blocks  -> the page's stylesheet, after the generated rules
//   <script> blocks -> the main timeline script, after the generated tweens
//   everything else -> the frame, above overlays and below captions (z-index lifts it higher)
import { readFileSync } from "node:fs";

export const EXTRA_TEMPLATE = `<!--
  Custom animation for this edit. edit.mjs folds this file into edit/index.html on every
  build, so it survives rebuilds (Studio changes don't). Files in ../extra/ are served at
  assets/extra/<name>. Prefix ids with "x-" so they never clash with generated ones.
-->

<style>
  /* Everything sits in the 1080x1920 frame. Captions are at ~1160-1440px; the bottom
     ~420px is covered by TikTok/Reels UI. z-index: 5 puts something above the captions. */
  #x-badge { position: absolute; right: 60px; top: 140px; opacity: 0; padding: 18px 30px; border-radius: 999px;
    background: var(--accent); color: var(--accent-text); font: 800 40px/1 "Inter", sans-serif; }
</style>

<div id="x-badge">New</div>

<script>
  // In scope: tl (the paused main timeline), gsap, fmt(value, decimals, prefix, suffix), and EDIT:
  //   EDIT.segments[i].start / .end / .clip    EDIT.cutEnd (end card starts)    EDIT.total
  //   EDIT.word("fade")     start of the first spoken "fade"; EDIT.word("fade", 1) for the second
  //   EDIT.words            [{ text, start, end }] for every caption word
  // Seek-safe only: tl.fromTo(..., { ..., immediateRender: false }, time). No timers, Math.random,
  // CSS animations or transitions; HyperFrames renders frames by seeking the timeline.
  const t = EDIT.segments[0].start + 0.5;
  tl.fromTo("#x-badge", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)", immediateRender: false }, t);
  tl.fromTo("#x-badge", { opacity: 1 }, { opacity: 0, duration: 0.2, immediateRender: false }, t + 2);
</script>
`;

/** Splits extra.html into css, markup and script, and checks the script parses. */
export function readExtra(path) {
  let src = readFileSync(path, "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const take = (tag) => {
    const parts = [];
    src = src.replace(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "gi"), (_, body) => (parts.push(body.trim()), ""));
    return parts.filter(Boolean).join("\n");
  };
  const css = take("style");
  const js = take("script");
  const html = src.trim();
  try {
    new Function("tl", "gsap", "fmt", "EDIT", js);
  } catch (e) {
    throw new Error(`extra.html <script> doesn't parse: ${e.message}`);
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  return { css, js, html, ids };
}

// Builds the EDIT object the extra script sees.
export function editRuntime({ cutEnd, total, timeline, groups, round }) {
  const data = {
    cutEnd,
    total,
    segments: timeline.map((s) => ({ clip: s.clip, start: s.start, end: round(s.start + s.duration) })),
    words: groups.flatMap((g) => g.words.map((w) => ({ text: w.text, start: w.start, end: w.end }))),
  };
  return `const EDIT = ${JSON.stringify(data)};
        EDIT.word = (word, n = 0) => {
          const clean = (s) => s.toLowerCase().replace(/[^a-z0-9']/g, "");
          const hit = EDIT.words.filter((w) => clean(w.text) === clean(word))[n];
          if (!hit) throw new Error("extra.html: no spoken word \\"" + word + "\\" (#" + n + ")");
          return hit.start;
        };`;
}
