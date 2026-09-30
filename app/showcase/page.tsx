import type { Metadata } from "next";
import Link from "next/link";
import { BeforeAfter } from "@/components/before-after";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { formatUSD, PRICE_PER_VIDEO, TURNAROUND_DAYS } from "@/lib/pricing";
import { SHOWCASE } from "@/lib/showcase";

export const metadata: Metadata = {
  title: "Showcase | Loopgrain",
  description:
    "Before and after: raw phone clips next to the finished Loopgrain edit, with captions, motion graphics, and a call to action.",
};

export default function ShowcasePage() {
  return (
    <>
      <SiteHeader current="showcase" />

      <main className="flex-1 overflow-x-clip">
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:pt-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-cobalt">Showcase</p>
          <h1 className="display mt-3 text-[clamp(3.25rem,9vw,6.5rem)] uppercase">
            Same clips.
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">Different video.</span>
              <span
                aria-hidden="true"
                className="absolute inset-x-[-0.1em] bottom-[0.08em] h-[0.32em] -rotate-1 bg-caption"
              />
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate">
            On the left, what came off the phone. On the right, what we sent back. Every edit gets a
            hook, captions, motion graphics, and an ending that tells viewers what to do next.
          </p>

          <nav aria-label="Jump to an example" className="mt-8 flex flex-wrap gap-2">
            {SHOWCASE.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="rounded-full border border-ink/20 bg-paper/60 px-4 py-2 text-sm font-semibold hover:border-ink/50"
              >
                {item.business}
              </a>
            ))}
          </nav>
        </section>

        {SHOWCASE.map((item, i) => (
          <section
            key={item.id}
            id={item.id}
            aria-labelledby={`${item.id}-title`}
            className={`scroll-mt-8 py-16 sm:py-24 ${i % 2 === 0 ? "bg-paper" : ""}`}
          >
            <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
              <div className={i % 2 === 1 ? "lg:order-2" : undefined}>
                <BeforeAfter item={item} />
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate">
                  <span className="display mr-2 text-2xl text-cobalt">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {item.business}
                </p>
                <h2 id={`${item.id}-title`} className="display mt-3 text-5xl sm:text-6xl">
                  “{item.title}”
                </h2>
                <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate">{item.summary}</p>

                <dl className="mt-8 grid max-w-md grid-cols-3 gap-4 border-y border-line py-5">
                  <div>
                    <dt className="text-xs text-slate">Raw clips in</dt>
                    <dd className="display mt-1 text-4xl">{item.clipsIn}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate">Video out</dt>
                    <dd className="display mt-1 text-4xl">1</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate">Length</dt>
                    <dd className="display mt-1 text-4xl tabular-nums">{item.length}</dd>
                  </div>
                </dl>

                <h3 className="mt-8 text-sm font-semibold">What we added</h3>
                <ul className="mt-3 space-y-2">
                  {item.added.map((line) => (
                    <li key={line} className="flex gap-3 text-slate">
                      <span
                        aria-hidden="true"
                        className="mt-2 size-2 shrink-0 rounded-full bg-caption ring-2 ring-ink"
                      />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}

        <p className="mx-auto w-full max-w-6xl px-4 pt-10 text-sm text-slate sm:px-6">
          These examples use licensed stock footage, edited the same way we edit yours.
        </p>

        <section className="mt-10 bg-ink py-20 text-paper">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 sm:px-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="display max-w-2xl text-5xl sm:text-6xl">Your clips could be next.</h2>
              <p className="mt-4 text-paper/70">
                {formatUSD(PRICE_PER_VIDEO)} per video, delivered within {TURNAROUND_DAYS} business
                days.
              </p>
            </div>
            <Link
              href="/sign-up"
              className="shrink-0 rounded-full bg-caption px-6 py-3.5 font-semibold text-ink hover:bg-paper"
            >
              Create an account
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
