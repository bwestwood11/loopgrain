// Visual styles for customer edits: edit.json "style" restyles every graphic at once
// (captions, hook, overlays, intro and end card). The animation is the same; type, shapes
// and surfaces change. Ported from the hero spots in video/*.
//
//   planner    paper cards, marker highlights, Anton + Inter (the base CSS; no overrides)
//   editorial  magazine: Fraunces serif, square cards, hairline rules, italic accents
//   hud        tech: Space Grotesk + mono labels, dark panels with accent corner brackets
//   broadcast  sports TV: Barlow Condensed italics, slanted slabs, bold bands
//
// Colour rules hold in every style so any brand stays readable: text on --paper is --ink,
// text on --accent is --accent-text, and --highlight text only sits on dark panels.

const s = (name, css) => css.replaceAll("&", `#root.st-${name}`);

// Accent corner brackets on a dark panel (hud).
const BRACKETS = [
  "top left/46px 5px", "top left/5px 46px", "top right/46px 5px", "top right/5px 46px",
  "bottom left/46px 5px", "bottom left/5px 46px", "bottom right/46px 5px", "bottom right/5px 46px",
].map((p) => `linear-gradient(var(--accent), var(--accent)) ${p}`).join(", ");
const HUD_PANEL = `background: ${BRACKETS}, linear-gradient(rgba(5, 9, 13, 0.86), rgba(5, 9, 13, 0.86)); background-repeat: no-repeat; border-radius: 0;`;
const SLANT = (pct) => `clip-path: polygon(${pct}% 0, 100% 0, ${100 - pct}% 100%, 0 100%);`;

export const STYLES = {
  planner: { fonts: [], em: 1, css: "" },

  editorial: {
    fonts: ["fraunces.woff2", "fraunces-italic.woff2"],
    em: 1.1,
    css: s("editorial", `
      & .cap { font-family: "Fraunces", serif; font-style: italic; font-weight: 600; font-size: 100px; text-transform: none; letter-spacing: -0.01em;
        -webkit-text-stroke: 7px rgba(0, 0, 0, 0.88); paint-order: stroke fill; text-shadow: 0 4px 26px rgba(0, 0, 0, 0.7); }
      & #hook { background: transparent; color: #fff; border-radius: 0; padding: 0 0 26px; text-align: left; border-bottom: 5px solid var(--highlight);
        font-family: "Fraunces", serif; font-weight: 600; font-size: 96px; text-transform: none; text-shadow: 0 6px 30px rgba(0, 0, 0, 0.6); }

      & .ov.anton, & .ov .anton { font-family: "Fraunces", serif; font-weight: 600; text-transform: none; letter-spacing: -0.015em; }
      & .ov-title .l span { -webkit-text-stroke: 6px rgba(0, 0, 0, 0.85); paint-order: stroke fill; }
      & .ov-title .mark span { color: #fff; font-style: italic; padding: 0 6px; }
      & .ov-title .mark i { top: auto; bottom: 3%; height: 8px; left: 6px; right: 6px; transform: none; background: var(--highlight); }
      & .ov-lower .slab { border-radius: 0; border-left: 10px solid var(--accent); padding: 34px 54px 36px 60px; }
      & .ov-lower .tag { background: none; color: inherit; padding: 0; opacity: 0.75; font: italic 600 36px "Fraunces", serif; letter-spacing: 0; text-transform: none; }
      & .ov-lower .meta { font-family: "Fraunces", serif; font-style: italic; }
      & .ov-rating { border-radius: 4px; }
      & .ov-stats .stat { border-radius: 0; border-left: 0; border-top: 6px solid var(--highlight); }
      & .ov-stats .k { font: italic 600 34px "Fraunces", serif; letter-spacing: 0; text-transform: none; }
      & .ov-check { border-radius: 0; background-image: none; border-top: 10px solid var(--accent); }
      & .ov-check::before { display: none; }
      & .ov-check .head { font: italic 600 36px "Fraunces", serif; letter-spacing: 0; text-transform: none; }
      & .ov-check li { font-family: "Fraunces", serif; font-weight: 600; }
      & .ov-check .box { border-radius: 50%; }
      & .ov-stamp { border-radius: 0; background: var(--paper); color: var(--ink); border: 3px solid var(--ink); }
      & .ov-stamp small { font: italic 600 30px "Fraunces", serif; letter-spacing: 0; text-transform: none; }
      & .ov-tour { border-radius: 0; }
      & .ov-tour .stop span { font: italic 600 30px/1 "Fraunces", serif; letter-spacing: 0; text-transform: none; }
      & .ov-intro { background-image: none; }
      & .ov-intro .head small { font: italic 600 36px "Fraunces", serif; letter-spacing: 0; text-transform: none; }
      & .ov-intro .head b { font-family: "Fraunces", serif; font-weight: 600; font-style: italic; text-transform: none; letter-spacing: -0.02em; }
      & .ov-intro [data-label] { font: italic 600 30px "Fraunces", serif; letter-spacing: 0; text-transform: none; }

      & #end .name { font: 600 40px "Fraunces", serif; letter-spacing: 0.3em; padding: 14px 0; border-top: 2px solid currentColor; border-bottom: 2px solid currentColor; }
      & #end .tag { background: none; color: inherit; padding: 0; margin-top: 36px; font: italic 600 40px "Fraunces", serif; letter-spacing: 0; text-transform: none; opacity: 0.85; }
      & #end .headline { font-family: "Fraunces", serif; font-weight: 600; font-size: 140px; line-height: 1; text-transform: none; letter-spacing: -0.02em; }
      & #end .button { background: transparent; color: var(--ink); border: 4px solid var(--ink); border-radius: 0; font: italic 600 54px "Fraunces", serif; }
      & #end .ripple { border-radius: 0; border-color: var(--ink); }
      & #end .sub { font: italic 500 40px "Fraunces", serif; }`),
  },

  hud: {
    fonts: ["space-grotesk.woff2", "jetbrains-mono.woff2"],
    em: 1.22,
    css: s("hud", `
      & .cap { font-family: "Space Grotesk", sans-serif; font-weight: 700; font-size: 92px; letter-spacing: 0.01em; -webkit-text-stroke: 8px #000; }
      & #hook { ${HUD_PANEL} color: #fff; font-family: "Space Grotesk", sans-serif; font-weight: 700; font-size: 80px; letter-spacing: -0.01em; }

      & .ov.anton, & .ov .anton { font-family: "Space Grotesk", sans-serif; font-weight: 700; letter-spacing: -0.02em; }
      & .ov-title .l span { -webkit-text-stroke: 7px rgba(0, 0, 0, 0.9); paint-order: stroke fill; }
      & .ov-title .mark span { color: #fff; }
      & .ov-title .mark i { background: transparent; border: 5px solid var(--accent); transform: none; top: 6%; bottom: 0; }
      & .ov-lower .slab { ${HUD_PANEL} color: #fff; }
      & .ov-lower .tag { background: none; color: var(--highlight); padding: 0; font: 700 28px "JetBrains Mono", monospace; letter-spacing: 0.08em; }
      & .ov-lower .tag::before { content: "[ "; } & .ov-lower .tag::after { content: " ]"; }
      & .ov-lower .meta { font: 600 28px "JetBrains Mono", monospace; }
      & .ov-rating { ${HUD_PANEL} color: #fff; }
      & .ov-rating .src { font-family: "JetBrains Mono", monospace; }
      & .ov-rating .stars path { stroke: #000; }
      & .ov-stats .stat { ${HUD_PANEL} }
      & .ov-stats .k { font: 700 26px "JetBrains Mono", monospace; letter-spacing: 0.06em; }
      & .ov-check { ${HUD_PANEL} color: #fff; }
      & .ov-check::before { display: none; }
      & .ov-check .head { font: 700 28px "JetBrains Mono", monospace; color: var(--highlight); opacity: 1; }
      & .ov-check li { font-family: "Space Grotesk", sans-serif; font-weight: 600; }
      & .ov-check .box { border-color: #fff; border-radius: 0; }
      & .ov-stamp { ${HUD_PANEL} color: var(--highlight); }
      & .ov-stamp small { font: 700 26px "JetBrains Mono", monospace; color: #fff; opacity: 0.85; }
      & .ov-tour { ${HUD_PANEL} }
      & .ov-tour .stop b { border-radius: 0; }
      & .ov-tour .stop span { font: 700 24px/1 "JetBrains Mono", monospace; color: #fff; }
      & .ov-freeze .pcap span { font: 700 64px "JetBrains Mono", monospace; letter-spacing: -0.02em; }
      & .ov-intro .head b { font-family: "Space Grotesk", sans-serif; font-weight: 700; letter-spacing: -0.03em; }

      & #end { background-image: linear-gradient(color-mix(in srgb, var(--ink) 7%, transparent) 2px, transparent 2px),
          linear-gradient(90deg, color-mix(in srgb, var(--ink) 7%, transparent) 2px, transparent 2px); background-size: 108px 108px; }
      & #end .name { font: 700 34px "JetBrains Mono", monospace; letter-spacing: 0.14em; }
      & #end .tag { border-radius: 0; font-family: "JetBrains Mono", monospace; }
      & #end .headline { font-family: "Space Grotesk", sans-serif; font-weight: 700; font-size: 124px; letter-spacing: -0.03em; }
      & #end .btnwrap { padding: 24px; background: ${BRACKETS}; background-repeat: no-repeat; }
      & #end .button { border-radius: 0; font-family: "Space Grotesk", sans-serif; font-weight: 700; }
      & #end .ripple { inset: 24px; border-radius: 0; }
      & #end .sub { font: 600 32px "JetBrains Mono", monospace; }`),
  },

  broadcast: {
    fonts: ["barlow-cond-800i.woff2", "barlow-cond-600i.woff2"],
    em: 0.92,
    css: s("broadcast", `
      & .cap { font-family: "Barlow Condensed", sans-serif; font-style: italic; font-weight: 800; font-size: 130px; letter-spacing: 0; }
      & #hook { border-radius: 0; ${SLANT(4)} padding: 30px 70px; font-family: "Barlow Condensed", sans-serif; font-style: italic; font-weight: 800; font-size: 108px; }

      & .ov.anton, & .ov .anton { font-family: "Barlow Condensed", sans-serif; font-style: italic; font-weight: 800; letter-spacing: 0; }
      & .ov-title .mark i { transform: skewX(-14deg); top: 10%; bottom: 4%; left: 24px; right: 24px; }
      & .ov-lower .slab { border-radius: 0; clip-path: polygon(0 0, 100% 0, 93% 100%, 0 100%); border-left: 16px solid var(--accent); padding-right: 120px; }
      & .ov-lower .tag { border-radius: 0; ${SLANT(6)} padding: 8px 30px; font: italic 800 34px "Barlow Condensed", sans-serif; }
      & .ov-lower .meta { font: italic 600 40px "Barlow Condensed", sans-serif; }
      & .ov-rating { border-radius: 0; ${SLANT(3)} padding-left: 56px; padding-right: 60px; }
      & .ov-rating .src { font: italic 600 34px "Barlow Condensed", sans-serif; }
      & .ov-stats .stat { border-radius: 0; clip-path: polygon(0 0, 100% 0, 94% 100%, 0 100%); }
      & .ov-stats .k { font: italic 800 34px "Barlow Condensed", sans-serif; letter-spacing: 0.04em; }
      & .ov-check { border-radius: 0; background-image: none; clip-path: polygon(0 0, 100% 0, 97% 100%, 0 100%); border-left: 18px solid var(--accent); }
      & .ov-check::before { display: none; }
      & .ov-check .head { font: italic 800 38px "Barlow Condensed", sans-serif; letter-spacing: 0.04em; }
      & .ov-check li { font-family: "Barlow Condensed", sans-serif; font-style: italic; font-weight: 600; }
      & .ov-stamp { border-radius: 0; ${SLANT(5)} padding: 20px 64px 14px; }
      & .ov-stamp small { font: italic 800 32px "Barlow Condensed", sans-serif; letter-spacing: 0.06em; }
      & .ov-tour { border-radius: 0; ${SLANT(3)} }
      & .ov-tour .stop span { font: italic 800 32px/1 "Barlow Condensed", sans-serif; letter-spacing: 0.04em; }
      & .ov-freeze .pcap span { font: italic 800 84px "Barlow Condensed", sans-serif; text-transform: uppercase; }
      & .ov-intro { background-image: repeating-linear-gradient(-60deg, color-mix(in srgb, var(--ink) 6%, transparent) 0 46px, transparent 46px 140px); }
      & .ov-intro .head small { font: italic 800 38px "Barlow Condensed", sans-serif; letter-spacing: 0.08em; }
      & .ov-intro .head b { font-family: "Barlow Condensed", sans-serif; font-style: italic; font-weight: 800; }
      & .ov-intro [data-label] { font: italic 800 32px "Barlow Condensed", sans-serif; }

      & #end { background-image: linear-gradient(168deg, transparent 0 16%, var(--accent) 16% 21%, transparent 21% 79%, var(--accent) 79% 84%, transparent 84%); }
      & #end .name { font: italic 800 48px "Barlow Condensed", sans-serif; letter-spacing: 0.12em; }
      & #end .tag { border-radius: 0; ${SLANT(6)} padding: 10px 36px; font: italic 800 36px "Barlow Condensed", sans-serif; }
      & #end .headline { font-family: "Barlow Condensed", sans-serif; font-style: italic; font-weight: 800; font-size: 176px; line-height: 0.92; }
      & #end .button { border-radius: 0; ${SLANT(6)} padding: 30px 96px; font: italic 800 66px "Barlow Condensed", sans-serif; }
      & #end .button::after { content: " \\00BB"; }
      & #end .ripple { border-radius: 0; }
      & #end .sub { font: italic 600 42px "Barlow Condensed", sans-serif; }`),
  },
};
