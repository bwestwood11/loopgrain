import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroShowcase } from "@/components/hero-showcase";
import { EditTimeline } from "@/components/edit-timeline";
import { VideoCalculator } from "@/components/video-calculator";
import { formatMinutes } from "@/lib/format";
import {
  formatUSD,
  MAX_CLIPS_PER_PROJECT,
  MAX_RAW_SECONDS,
  MAX_VIDEO_SECONDS,
  MAX_REVISIONS,
  PRICE_PER_VIDEO,
  REVISION_TURNAROUND_DAYS,
  TURNAROUND_DAYS,
} from "@/lib/pricing";

const STEPS = [
  {
    title: "Choose how many videos",
    body: "Create an account and pick a number. You pay for those videos and nothing else.",
  },
  {
    title: "Upload your raw clips",
    body: `Up to ${formatMinutes(MAX_RAW_SECONDS)} of footage per video, straight from your phone. Add a note about what you want people to do.`,
  },
  {
    title: "Post the finished videos",
    body: `Edited videos come back within ${TURNAROUND_DAYS} business days, sized for Reels, TikTok, and YouTube Shorts.`,
  },
];

const BUSINESSES = [
  "Restaurants and cafés",
  "Salons and barbers",
  "Contractors and home services",
  "Gyms and studios",
  "Real estate agents",
  "Dentists and clinics",
  "Boutiques and shops",
  "Auto shops",
  "Coaches and consultants",
];

const FAQS = [
  {
    q: "How much footage can I send?",
    a: `Up to ${formatMinutes(MAX_RAW_SECONDS)} of raw footage in up to ${MAX_CLIPS_PER_PROJECT} clips for each video. Retakes and extra angles are fine. We pick the best moments and cut them into one video under ${MAX_VIDEO_SECONDS} seconds.`,
  },
  {
    q: "What if I have more footage than that?",
    a: `Split it into separate videos, each with its own ${formatMinutes(MAX_RAW_SECONDS)} of footage, or trim the parts you know you won't use before uploading.`,
  },
  {
    q: "Do I need a subscription?",
    a: "No. Order five videos this month and none next month if that's what works. There's nothing to cancel.",
  },
  {
    q: "What should I film?",
    a: "Talk to the camera about something customers ask you, show a job from start to finish, or give a quick tour. Good light and clear audio matter more than a fancy camera.",
  },
  {
    q: "What do I get back?",
    a: "A vertical 1080×1920 MP4 for each clip, ready to upload to Instagram, TikTok, YouTube Shorts, and Facebook.",
  },
  {
    q: "What if I want something changed?",
    a: `Every video includes ${MAX_REVISIONS} revision requests. Once it's delivered, ask for changes from your dashboard, with timestamps if you can, and the updated video comes back within ${REVISION_TURNAROUND_DAYS} business days.`,
  },
  {
    q: "Who owns the finished videos?",
    a: "You do. Post them anywhere, run them as ads, and keep them forever.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1 overflow-x-clip">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-20 pt-8 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:pt-16">
          <div>
            <h1 className="display text-[clamp(3.25rem,9vw,6.5rem)] uppercase">
              You film it.
              <br />
              We make it worth watching.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate">
              Loopgrain turns the raw clips on your phone into short-form videos with captions,
              motion graphics, and your branding. You pay per video. No subscription, no editing
              software, no learning curve.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/sign-up?videos=1"
                className="rounded-full bg-cobalt px-6 py-3.5 font-semibold text-white hover:bg-cobalt-deep"
              >
                Get your first video edited for {formatUSD(PRICE_PER_VIDEO)}
              </Link>
              <a
                href="#pricing"
                className="rounded-full border border-ink/20 px-6 py-3.5 font-semibold hover:bg-paper"
              >
                See pricing
              </a>
            </div>
            <p className="mt-5 text-sm text-slate">
              Set up a free account in a minute, then upload your clips. Finished videos under{" "}
              {MAX_VIDEO_SECONDS} seconds.
            </p>
          </div>

          <HeroShowcase />
        </section>

        {/* What's in every edit */}
        <section className="bg-paper py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 className="display max-w-3xl text-5xl sm:text-6xl">What goes into every edit</h2>
            <p className="mt-4 max-w-2xl text-lg text-slate">
              The things that make people stop, watch, and call you, layered onto every video you
              order.
            </p>
            <div className="mt-10">
              <EditTimeline />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="display text-5xl sm:text-6xl">How it works</h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, i) => (
              <li key={step.title} className="border-t-2 border-ink pt-5">
                <span className="display text-5xl text-cobalt">{i + 1}</span>
                <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-slate">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-8 bg-paper py-20">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="display text-5xl sm:text-6xl">
                One price.
                <br />
                Per video.
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate">
                Every video gets the full edit for {formatUSD(PRICE_PER_VIDEO)}. Order one to try us
                out or fifty for the quarter. The price doesn&apos;t change and nothing renews.
              </p>
              <ul className="mt-6 space-y-2 text-slate">
                <li>Up to {formatMinutes(MAX_RAW_SECONDS)} of raw footage per video</li>
                <li>Finished videos under {MAX_VIDEO_SECONDS} seconds</li>
                <li>Delivered within {TURNAROUND_DAYS} business days</li>
                <li>{MAX_REVISIONS} revisions included</li>
                <li>Sized for Reels, TikTok, and Shorts</li>
              </ul>
            </div>
            <VideoCalculator />
          </div>
        </section>

        {/* Who it's for */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="display max-w-3xl text-5xl sm:text-6xl">
            Built for businesses that would rather be running the business
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-slate">
            If your customers scroll social media, short videos bring them to you. You don&apos;t
            need to learn to edit to show up there.
          </p>
          <ul className="mt-8 flex flex-wrap gap-2">
            {BUSINESSES.map((b) => (
              <li key={b} className="rounded-full border border-ink/15 bg-paper px-4 py-2 text-sm">
                {b}
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-8 bg-paper py-20">
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
            <h2 className="display text-5xl sm:text-6xl">Questions</h2>
            <div className="mt-8 divide-y divide-line border-y border-line">
              {FAQS.map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                    {f.q}
                    <span
                      aria-hidden="true"
                      className="text-2xl text-cobalt transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-slate">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="bg-ink py-20 text-paper">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 sm:px-6 md:flex-row md:items-end md:justify-between">
            <h2 className="display max-w-2xl text-5xl sm:text-6xl">
              Your next customer is scrolling right now.
            </h2>
            <Link
              href="/sign-up?videos=1"
              className="shrink-0 rounded-full bg-caption px-6 py-3.5 font-semibold text-ink hover:bg-paper"
            >
              Get your first video edited for {formatUSD(PRICE_PER_VIDEO)}
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
