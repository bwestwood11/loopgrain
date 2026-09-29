"use client";

import Link from "next/link";
import { useState } from "react";
import { formatUSD, PRICE_PER_VIDEO } from "@/lib/pricing";

const MIN = 1;
const MAX = 100;

export function VideoCalculator({ signedIn = false }: { signedIn?: boolean }) {
  const [count, setCount] = useState(5);
  const set = (n: number) => setCount(Math.min(MAX, Math.max(MIN, n || MIN)));

  return (
    <div className="rounded-2xl bg-ink p-6 text-paper sm:p-8">
      <label htmlFor="video-count" className="text-sm text-paper/70">
        How many videos do you need?
      </label>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => set(count - 1)}
          disabled={count <= MIN}
          aria-label="One fewer video"
          className="grid size-12 place-items-center rounded-full border border-paper/25 text-2xl hover:bg-paper/10 disabled:opacity-30"
        >
          −
        </button>
        <input
          id="video-count"
          type="number"
          inputMode="numeric"
          min={MIN}
          max={MAX}
          value={count}
          onChange={(e) => set(parseInt(e.target.value, 10))}
          className="display w-24 bg-transparent text-center text-6xl tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => set(count + 1)}
          disabled={count >= MAX}
          aria-label="One more video"
          className="grid size-12 place-items-center rounded-full border border-paper/25 text-2xl hover:bg-paper/10 disabled:opacity-30"
        >
          +
        </button>
      </div>

      <dl className="mt-8 space-y-2 border-t border-paper/15 pt-5 text-sm">
        <div className="flex justify-between text-paper/70">
          <dt>{formatUSD(PRICE_PER_VIDEO)} per video</dt>
          <dd className="tabular-nums">× {count}</dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-base">Total</dt>
          <dd className="display text-4xl tabular-nums" aria-live="polite">
            {formatUSD(PRICE_PER_VIDEO * count)}
          </dd>
        </div>
      </dl>

      {signedIn ? (
        <>
          <button
            type="button"
            disabled
            className="mt-6 w-full rounded-full bg-caption px-5 py-3.5 font-semibold text-ink disabled:opacity-60"
          >
            Check out {count} {count === 1 ? "video" : "videos"}
          </button>
          <p className="mt-3 text-center text-xs text-paper/60">
            Online checkout opens soon. We&apos;ll email you when it&apos;s live.
          </p>
        </>
      ) : (
        <>
          <Link
            href={`/sign-up?videos=${count}`}
            className="mt-6 block w-full rounded-full bg-caption px-5 py-3.5 text-center font-semibold text-ink hover:bg-paper"
          >
            Create an account to order
          </Link>
          <p className="mt-3 text-center text-xs text-paper/60">
            No subscription. You only pay for the videos you order.
          </p>
        </>
      )}
    </div>
  );
}
