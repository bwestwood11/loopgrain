# Loopgrain house style

Every customer edit is built to this standard. It was set with the Fieldline Outdoor test job;
its `edit.json` is kept as `reference.edit.json` (with `reference.blueprint.svg`). Read it before
writing a new one. Step 4 of the pipeline (writing `edit.json`) follows this document.

## The shape of every edit

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
