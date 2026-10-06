# Loopgrain house style

Every customer edit is built to this standard. It was set with the Fieldline Outdoor test job;
its `edit.json` is kept as `reference.edit.json` (with `reference.blueprint.svg`). Read it before
writing a new one. Step 4 of the pipeline (writing `edit.json`) follows this document.

## No two edits alike

Edits must not come out in the same format. Before writing `edit.json`, read the `style` and
`_notes` of the last few edits in `video/jobs/*/edit.json`, then choose differently:

- **Style** (`"style"` in edit.json, defined in `styles.mjs`) restyles every graphic at once:
  - `planner`: paper cards, marker highlights, Anton. Coaching, services, home trades.
  - `editorial`: serif, square cards, hairline rules, italic captions. Barbers, salons, boutiques, food, real estate.
  - `hud`: dark bracketed panels, mono labels, grotesk caps. Detailing, cleaning, repairs, anything technical.
  - `broadcast`: slanted slabs, condensed italics, striped end card. Fitness, sports, high-energy trades.

  Match the business first. When two styles fit, use the one not used most recently.
- **Structure:** the beats below are a menu, not a checklist. Use the ones the footage earns,
  in the order the footage suggests. Don't repeat the same overlay line-up as the previous edit.
- **Transitions, grade and motion** follow the footage and style, not the last job.
- Record the choice in `_notes` (style, beats used, and why) so the next edit can vary from it.

## Talking-head reference: kinetic keyword captions

For clips where someone talks to camera and the edit cuts between them and b-roll of the work.
Reference: a 26s PPF video from a Tampa detailing shop, kept locally (git-ignored, not ours to
publish) at `references/neon-talking-head.mp4`, with frame sheets (`.sheet1/2.jpg`, every 0.5s)
and a word-timed transcript. Look at the sheets before writing an edit in this style.

What makes it work:
- **Keyword-led captions, not subtitles.** Only the words that carry the pitch get big type:
  `GT3`, `PPF`, `YOU HIT`, `DECREASES THE VALUE OF YOUR CAR`, `SHOWROOM READY`, `20,000 MILES`.
  Each lands exactly as it's spoken. The filler between them runs as a small white italic
  line (one to three words at a time) under the keyword.
- **A keyword stays while its sentence plays.** `PAINT / PROTECTION / FILM` holds for ~6s
  across several b-roll cuts while the small line underneath keeps changing
  ("is an", "invisible", "layer", "goes over", "your paint"...).
- **Stacks build line by line.** The opener spells out the claim as it's said: `GT3`, then
  `20,000 Miles`, then `$0 Paint Damage`, left-aligned with the first line larger.
- **Staircase layout.** Multi-word keywords stack with each line offset right
  (`PAINT` / `  PROTECTION` / `      FILM`), so they read as one block, not a centered paragraph.
- **Type:** heavy, wide, italic caps in one bright accent (aqua there, matched to the shop's
  hex lights and logo) with a soft glow of the same color. The small line is thin white italic.
  Two weights and one accent color. No caption boxes or backgrounds.
- **Mid-frame, not the bottom band.** Text sits around y 500-1250, beside or over the subject's
  chest, never over the face.
- **Text behind the subject** once or twice (`TO LOOK THIS GOOD`, `20,000 MILES` sit behind the
  speaker's head). Use only where the subject separates cleanly from the background.
- **Motion:** words punch in with motion blur and a slight overshoot. They leave with a
  horizontal smear or glitch, not a fade. A-roll ↔ b-roll cuts are whips and blur-pushes.
  The talking head gets slow push-ins between cuts.
- **Sound:** every keyword slam and every whip has a sound effect (whoosh into blurs, a hit or
  riser on the big keywords). The automated audio scan couldn't separate them from the voice,
  so time them by ear when cutting.
- **Brand beats:** the logo, recolored to the accent, pops mid-frame over b-roll when the
  business is named. The close is an outlined glowing pill (`BOOK TODAY`) over the speaker.
- **Pacing:** b-roll shots hold 1-2s each and match what's being said (film going on while
  "goes over your paint" plays). The speaker comes back for the claims and the call to action.

Build it with `"captions": { "mode": "keywords", ... }` (see `keywords.mjs`). Sound effects come
with it (`"sfx"`: swooshes, a ding on big keywords, a cash register on money words; files in
`video/shared/sfx/`). Give silent or music-only B-roll segments
`"captions": false`. Text behind the subject isn't built yet. First used on job a2e82b (test).

Apply this to the job's own brand color and type, not the Tampa shop's aqua. It sits best on
the `hud` or `broadcast` style. The variety rule still applies: don't use it on every
talking-head job in a row.

## The beats

Each beat gets its own graphic, and the graphics take turns. Times are a guide for a ~15s cut.

| Beat | When | What | Overlay |
|---|---|---|---|
| Open | 0-2s | A full-frame branded opener that wipes into the footage. Skip it when the clip opens on someone talking to camera: the person is the hook. If used, give it at least ~2s ("duration": 2+); 1.3s read as too quick | `intro` (+ a drawing if the trade has a natural one: plan, floor plan, chair diagram, menu) |
| Hook | ~1.4-3.5s | The promise, in two lines, second line marked | `title` (or `hook` for talking-head videos) |
| Proof | early | Why trust them: numbers that count up, a star rating | `stats`, `rating` |
| What | middle | The services or steps, synced to when each is on screen | `checklist`, `stamp`, `circle`, `lowerThird` |
| Wow | middle-late | One moment that stops the scroll | `freeze` (or a `circle` callout on a steady shot) |
| Structure | throughout | Where we are in the story, when the footage moves through places or steps | `tour` |
| Close | end card | Business name, offer pill, headline, button with a tapping hand, service area | `cta` with `tag` and `tap: true` |

Always on, in edit.json:
- `grade`: a look that suits the footage (skin-soft for people, warm-daylight for outdoor work, food-pop for food).
- `motion`: `push` for talking heads and still shots; `drift` for footage that already moves (gimbal, drone).
- A transition on every cut, varied (`whip`, `flash`, `zoom`; `slash` or `iris` once at most). Land them on cuts the footage already has when there's music.

## Placement

- Top zone (y ~300-900) holds one graphic at a time. The bottom zone holds the `tour` only.
- With captions on, nothing goes in the caption band (~1160-1440px). The `tour` moves to the top (y 190).
- Nothing goes below ~1500px: TikTok and Reels cover it. For Facebook, stay between ~300px and ~1600px (4:5 feed crop).
- One idea per beat. If two graphics fight for the same moment, cut the weaker one.
- Graphics start after the intro finishes (the build warns on overlaps).

## Facts

- Real customers: every name, number, rating, offer and service area comes from the brief, the
  customer, or text that is in the footage itself. If the brief lacks them, list what's missing
  and ask before rendering. Leave a graphic out rather than invent its content.
- Test jobs may invent facts, labelled as test data in `edit.json` `_notes`.
- Labels must match what's on screen at that moment.

## Before handing it over

1. `npm run video:edit -- <job>`: fix every `!` warning.
2. `npx hyperframes check --snapshots --at <key moments>` in `edit/`: 0 errors and 0 warnings. Look at the snapshot frames, not just the report.
3. `--render`, then pull frames from `final.mp4` at each beat and check them.
4. Tell the user what was built beat by beat, and what facts need confirming.

Anything the library can't do goes in the job's `extra.html`. If it would suit other jobs, move it
into `overlays.mjs` afterwards, as was done with `intro` and `tour`.
