// "What's in every edit", drawn as tracks in an editing timeline.
// Clip positions are percentages of a 60-second video.

type Track = {
  name: string;
  detail: string;
  color: string;
  clips: [start: number, length: number][];
};

const TRACKS: Track[] = [
  {
    name: "Hook",
    detail: "A strong opening in the first two seconds so people stop scrolling.",
    color: "bg-caption",
    clips: [[0, 5]],
  },
  {
    name: "Cuts and pacing",
    detail: "Pauses and stumbles removed, trimmed tight so viewers stay to the end.",
    color: "bg-[#8ea3ff]",
    clips: [[0, 14], [15, 20], [36, 11], [48, 16], [65, 22], [88, 12]],
  },
  {
    name: "Captions",
    detail: "Word-by-word captions in your colors. Most people watch with the sound off.",
    color: "bg-paper",
    clips: [[2, 9], [13, 11], [26, 8], [36, 14], [52, 10], [64, 13], [79, 12]],
  },
  {
    name: "Motion graphics",
    detail: "Animated titles, prices, and callouts that point at what matters.",
    color: "bg-cobalt",
    clips: [[6, 10], [40, 9], [70, 8]],
  },
  {
    name: "Music and sound",
    detail: "Licensed music and sound effects, mixed under your voice.",
    color: "bg-[#5ec29a]",
    clips: [[0, 100]],
  },
  {
    name: "Brand and call to action",
    detail: "Your logo and a closing line that tells viewers what to do next.",
    color: "bg-[#ff8a65]",
    clips: [[0, 3], [90, 10]],
  },
];

const RULER = ["0:00", "0:15", "0:30", "0:45", "1:00"];

export function EditTimeline() {
  return (
    <div className="rounded-2xl bg-ink p-4 text-paper sm:p-6">
      <div className="hidden grid-cols-[minmax(0,18rem)_1fr] gap-6 pb-3 text-[11px] tabular-nums text-paper/50 md:grid">
        <span />
        <div className="flex justify-between">
          {RULER.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-paper/10">
        {TRACKS.map((track) => (
          <li
            key={track.name}
            className="grid gap-3 py-4 md:grid-cols-[minmax(0,18rem)_1fr] md:items-center md:gap-6"
          >
            <div>
              <h3 className="font-semibold">{track.name}</h3>
              <p className="mt-1 text-sm leading-snug text-paper/65">{track.detail}</p>
            </div>
            <div className="relative h-8 rounded-md bg-paper/[0.06]" aria-hidden="true">
              {track.clips.map(([start, length], i) => (
                <span
                  key={i}
                  className={`absolute inset-y-1 rounded-[4px] ${track.color}`}
                  style={{ left: `${start}%`, width: `${length}%` }}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
