"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { buyVideos } from "@/app/dashboard/actions";
import { formatUSD, MAX_VIDEOS_PER_ORDER, PRICE_PER_VIDEO } from "@/lib/pricing";

const MIN = 1;
const MAX = MAX_VIDEOS_PER_ORDER;
const PRESETS = [1, 3, 5, 10];

export function VideoCalculator({
  signedIn = false,
  initialCount = 1,
}: {
  signedIn?: boolean;
  initialCount?: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [state, action, pending] = useActionState(buyVideos, undefined);
  const set = (n: number) => setCount(Math.min(MAX, Math.max(MIN, n || MIN)));
  const noun = count === 1 ? "video" : "videos";

  return (
    <div className="rounded-2xl bg-ink p-6 text-paper sm:p-8">
      <label htmlFor="video-count" className="text-sm text-paper/70">
        How many videos do you need?
      </label>

      {signedIn && (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quick picks">
          {PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set(n)}
              aria-pressed={count === n}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                count === n
                  ? "bg-caption text-ink"
                  : "border border-paper/25 text-paper hover:bg-paper/10"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

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
        <form action={action}>
          <input type="hidden" name="quantity" value={count} />
          <button
            type="submit"
            disabled={pending}
            className="mt-6 w-full rounded-full bg-caption px-5 py-3.5 font-semibold text-ink hover:bg-paper disabled:opacity-60"
          >
            {pending ? "Opening checkout…" : `Buy ${count} ${noun}`}
          </button>
          {state?.error && (
            <p
              role="alert"
              className="mt-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
            >
              {state.error}
            </p>
          )}
          <p className="mt-3 text-center text-xs text-paper/60">
            Paid videos stay on your account. Each project you send uses one.
          </p>
        </form>
      ) : (
        <>
          <Link
            href={`/sign-up?videos=${count}`}
            className="mt-6 block w-full rounded-full bg-caption px-5 py-3.5 text-center font-semibold text-ink hover:bg-paper"
          >
            Order {count} {noun} for {formatUSD(PRICE_PER_VIDEO * count)}
          </Link>
          <p className="mt-3 text-center text-xs text-paper/60">
            You&apos;ll set up a free account first. No subscription.
          </p>
        </>
      )}
    </div>
  );
}
