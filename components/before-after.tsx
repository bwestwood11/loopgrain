"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ShowcaseItem } from "@/lib/showcase";

// Two phones side by side: the raw clips and the edit, playing in lockstep.
// They start when scrolled into view and pause when scrolled away.

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function formatTime(s: number) {
  const t = Math.floor(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

function Phone({
  label,
  tone,
  video,
  videoRef,
  tilt,
}: {
  label: string;
  tone: "before" | "after";
  video: ShowcaseItem["before"];
  videoRef: React.RefObject<HTMLVideoElement | null>;
  tilt: number;
}) {
  return (
    <figure className="w-[var(--phone)] shrink-0" style={{ transform: `rotate(${tilt}deg)` }}>
      <figcaption
        className={`mb-3 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
          tone === "after" ? "bg-caption text-ink" : "bg-ink/10 text-slate"
        }`}
      >
        {label}
      </figcaption>
      <div
        className={`relative aspect-[9/16] overflow-hidden rounded-[clamp(18px,4vw,30px)] border-[clamp(4px,1vw,6px)] border-ink bg-ink ${
          tone === "after"
            ? "shadow-[0_40px_70px_-25px_rgba(21,33,59,0.6)]"
            : "shadow-[0_25px_50px_-25px_rgba(21,33,59,0.45)]"
        }`}
      >
        <video
          ref={videoRef}
          src={video.src}
          poster={video.poster}
          aria-label={video.alt}
          muted
          loop
          playsInline
          preload="none"
          className={`absolute inset-0 size-full object-cover ${tone === "before" ? "saturate-[0.85]" : ""}`}
        />
      </div>
    </figure>
  );
}

export function BeforeAfter({ item }: { item: ShowcaseItem }) {
  const root = useRef<HTMLDivElement>(null);
  const before = useRef<HTMLVideoElement>(null);
  const after = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState<boolean | null>(null); // null: follow scroll position
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );

  // Reduced motion never autoplays; otherwise play while on screen unless the
  // visitor has paused it themselves.
  const playing = paused === null ? inView && !reducedMotion : !paused;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.35,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const a = after.current;
    const b = before.current;
    if (!a || !b) return;
    if (playing) {
      a.preload = b.preload = "auto";
      b.currentTime = a.currentTime;
      a.play().catch(() => {});
      b.play().catch(() => {});
    } else {
      a.pause();
      b.pause();
    }
  }, [playing]);

  // The edit is the clock; the original follows it.
  useEffect(() => {
    const a = after.current;
    const b = before.current;
    if (!a || !b) return;
    const onTime = () => {
      setTime(a.currentTime);
      if (Math.abs(b.currentTime - a.currentTime) > 0.1) b.currentTime = a.currentTime;
    };
    const onMeta = () => setDuration(a.duration || 0);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  function seek(t: number) {
    const a = after.current;
    const b = before.current;
    if (!a || !b) return;
    a.currentTime = b.currentTime = t;
    setTime(t);
  }

  return (
    <div ref={root} className="flex flex-col items-center [--phone:clamp(138px,40vw,250px)]">
      <div className="flex items-end justify-center gap-[clamp(12px,4vw,36px)]">
        <Phone label="Before" tone="before" video={item.before} videoRef={before} tilt={-3} />
        <Phone label="After" tone="after" video={item.after} videoRef={after} tilt={2} />
      </div>

      <div className="mt-8 flex w-full max-w-sm items-center gap-3">
        <button
          type="button"
          onClick={() => setPaused(playing)}
          aria-label={
            playing ? `Pause the ${item.business} example` : `Play the ${item.business} example`
          }
          className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-paper hover:bg-cobalt"
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <rect x="2" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
              <rect x="8.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3 1.5v11l9-5.5z" fill="currentColor" />
            </svg>
          )}
        </button>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.05}
          value={time}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Scrub both videos"
          className="h-1.5 flex-1 cursor-pointer accent-cobalt"
        />
        <span className="w-10 text-right text-xs tabular-nums text-slate">{formatTime(time)}</span>
      </div>
    </div>
  );
}
