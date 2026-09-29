"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";

// Stock footage from Pexels (free license). Each edit is time-aligned with its original cut,
// so switching shows the same moment. Source compositions live in video/ (HyperFrames).

type View = "original" | "edited";

const SPOTS = [
  {
    id: "barber",
    label: "Barbershop",
    edited: "Barbershop clip edited: kinetic captions reading Walked in for a trim, a clock, a skin fade callout, the barber's name card, a five star rating, and a Book your chair end card",
    original: "Barbershop clip as filmed: three unedited phone clips of a haircut",
  },
  {
    id: "detailing",
    label: "Auto detailing",
    edited: "Auto detailing clip edited: kinetic captions reading Six months of road grime, a grime meter, a snow foam callout, the owner's name card, a five star rating, and a Book a detail end card",
    original: "Auto detailing clip as filmed: three unedited phone clips of a car being foamed and hand washed",
  },
  {
    id: "fitness",
    label: "Fitness studio",
    edited: "Fitness studio clip edited: kinetic captions reading She hated the gym, a week counter, a HIIT finisher callout, the trainer's name card, a five star rating, and a Claim a free session end card",
    original: "Fitness studio clip as filmed: three unedited phone clips of a client training with a coach",
  },
] as const;

const VIEWS: { value: View; label: string }[] = [
  { value: "original", label: "Original clips" },
  { value: "edited", label: "Loopgrain edit" },
];

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

// Position of each phone relative to the active one: -1 left, 0 front, 1 right.
function slotOf(index: number, active: number) {
  return ((index - active + SPOTS.length + 1) % SPOTS.length) - 1;
}

function Phone({
  spot,
  slot,
  view,
  reducedMotion,
  onSelect,
}: {
  spot: (typeof SPOTS)[number];
  slot: number;
  view: View;
  reducedMotion: boolean;
  onSelect: () => void;
}) {
  const edited = useRef<HTMLVideoElement>(null);
  const original = useRef<HTMLVideoElement>(null);
  const front = slot === 0;
  const showEdited = !front || view === "edited";

  // Every edit plays; an original only loads once its phone comes to the front.
  useEffect(() => {
    const a = edited.current;
    if (!a) return;
    if (reducedMotion) a.pause();
    else a.play().catch(() => {});
  }, [reducedMotion]);

  useEffect(() => {
    const a = edited.current;
    const b = original.current;
    if (!front || !a || !b || reducedMotion) return;
    b.preload = "auto";
    b.currentTime = a.currentTime;
    b.play().catch(() => {});
    const sync = () => {
      if (Math.abs(b.currentTime - a.currentTime) > 0.08) b.currentTime = a.currentTime;
    };
    a.addEventListener("timeupdate", sync);
    return () => {
      a.removeEventListener("timeupdate", sync);
      b.pause();
    };
  }, [front, reducedMotion]);

  const style: CSSProperties = {
    transform: `translateX(calc(${slot} * var(--spread))) scale(${front ? 1 : 0.8}) rotate(${slot * 7}deg)`,
    zIndex: front ? 3 : 1,
    filter: front ? "none" : "brightness(0.6) saturate(0.8)",
  };

  return (
    <div
      className="absolute left-1/2 top-0 -ml-[calc(var(--phone)/2)] w-[var(--phone)] transition-[transform,filter] duration-700 ease-[cubic-bezier(0.2,0.9,0.25,1.05)] motion-reduce:transition-none"
      style={style}
    >
      <div className="relative aspect-[9/16] overflow-hidden rounded-[30px] border-[6px] border-ink bg-ink shadow-[0_40px_70px_-25px_rgba(21,33,59,0.6)]">
        <video
          ref={original}
          src={`/hero/${spot.id}-original.mp4`}
          poster={`/hero/${spot.id}-original-poster.jpg`}
          aria-label={spot.original}
          aria-hidden={showEdited}
          muted
          loop
          playsInline
          preload="none"
          className="absolute inset-0 size-full object-cover"
        />
        <video
          ref={edited}
          src={`/hero/${spot.id}-edited.mp4`}
          poster={`/hero/${spot.id}-edited-poster.jpg`}
          aria-label={spot.edited}
          aria-hidden={!showEdited}
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 size-full object-cover transition-[clip-path] duration-500 ease-[cubic-bezier(0.7,0,0.2,1)] motion-reduce:transition-none"
          style={{ clipPath: showEdited ? "inset(0 0 0 0)" : "inset(0 0 0 100%)" }}
        />
      </div>
      {!front && (
        <button
          type="button"
          onClick={onSelect}
          aria-label={`Show the ${spot.label.toLowerCase()} example`}
          className="absolute inset-0 cursor-pointer rounded-[30px]"
        />
      )}
    </div>
  );
}

export function HeroShowcase() {
  const [active, setActive] = useState(0);
  const [view, setView] = useState<View>("edited");
  // Visitors who prefer reduced motion get the posters instead of autoplay.
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );

  const toggleKeys = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const next: View = view === "edited" ? "original" : "edited";
    setView(next);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next}"]`)?.focus();
  };

  return (
    <div
      className="flex w-full flex-col items-center py-2 [--phone:clamp(200px,52vw,300px)] [--spread:calc(var(--phone)*0.62)]"
    >
      <div className="relative h-[calc(var(--phone)*16/9)] w-full">
        {SPOTS.map((spot, i) => (
          <Phone
            key={spot.id}
            spot={spot}
            slot={slotOf(i, active)}
            view={view}
            reducedMotion={reducedMotion}
            onSelect={() => setActive(i)}
          />
        ))}
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-2" role="group" aria-label="Choose an example business">
        {SPOTS.map((spot, i) => (
          <button
            key={spot.id}
            type="button"
            aria-pressed={i === active}
            onClick={() => setActive(i)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              i === active
                ? "border-ink bg-ink text-paper"
                : "border-ink/20 bg-paper/60 text-ink hover:border-ink/50"
            }`}
          >
            {spot.label}
          </button>
        ))}
      </div>

      <div
        role="radiogroup"
        aria-label="Compare the original clips with the edited video"
        onKeyDown={toggleKeys}
        className="relative mt-3 grid w-full max-w-[320px] grid-cols-2 rounded-full bg-ink p-1.5 text-sm font-semibold"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-1.5 left-1.5 w-[calc(50%-0.375rem)] rounded-full bg-caption transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{ transform: view === "edited" ? "translateX(100%)" : "translateX(0)" }}
        />
        {VIEWS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={view === o.value}
            tabIndex={view === o.value ? 0 : -1}
            data-value={o.value}
            onClick={() => setView(o.value)}
            className={`relative z-10 rounded-full px-4 py-2.5 transition-colors ${
              view === o.value ? "text-ink" : "text-paper/75 hover:text-paper"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
