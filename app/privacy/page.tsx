import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CookieSettingsButton } from "@/components/cookie-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { RAW_CLIP_RETENTION_DAYS } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Privacy Policy | Loopgrain",
  description: "What Loopgrain collects, why, who it's shared with, and how to delete it.",
};

const CONTACT_EMAIL = "hello@loopgrain.io";
const UPDATED = "October 8, 2026";

const contact = (
  <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-cobalt underline-offset-2 hover:underline">
    {CONTACT_EMAIL}
  </a>
);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-8">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-4 space-y-4 leading-relaxed text-slate [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <article className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:px-6 lg:pt-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-cobalt">Legal</p>
          <h1 className="display mt-3 text-5xl uppercase sm:text-6xl">Privacy policy</h1>
          <p className="mt-4 text-sm text-slate">Last updated {UPDATED}</p>

          <p className="mt-8 text-lg leading-relaxed">
            Loopgrain edits short-form videos for small businesses. To do that we need your
            footage, a way to reach you, and a way to get paid. This page explains what we
            collect, why, who else handles it, and how to get it deleted. We don&apos;t sell your
            information, and we don&apos;t use it for advertising.
          </p>

          <div className="mt-12 space-y-10">
            <Section title="What we collect">
              <ul>
                <li>
                  <strong>Account details.</strong> Your name, email address, optional business
                  name, and password. Passwords are stored hashed, never in plain text.
                </li>
                <li>
                  <strong>Your footage and notes.</strong> The clips you upload, the brief you
                  write for each video, and any revision requests.
                </li>
                <li>
                  <strong>Finished videos.</strong> The edits we deliver to your dashboard.
                </li>
                <li>
                  <strong>Payment records.</strong> What you bought, how much you paid, and when.
                  Card details are entered on Stripe&apos;s checkout page and go straight to
                  Stripe. We never see or store your card number.
                </li>
                <li>
                  <strong>Usage data.</strong> Through Google Analytics: pages you visit, the
                  site that referred you, your device and browser type, your approximate location
                  (city or country, not your exact address), and actions like signing up, starting
                  checkout, and completing a purchase.
                </li>
              </ul>
            </Section>

            <Section title="How we use it">
              <ul>
                <li>To edit and deliver your videos and handle revisions.</li>
                <li>To run your account, process payments, and keep track of your prepaid videos.</li>
                <li>To contact you about your orders.</li>
                <li>
                  To understand which pages and marketing bring people to Loopgrain, so we can
                  improve the site.
                </li>
              </ul>
            </Section>

            <Section title="Your footage">
              <p>
                Your clips are used for one thing: making your videos. Only the people editing
                your project see them.
              </p>
              <p>
                We&apos;d love to show great edits on our{" "}
                <Link href="/showcase" className="font-semibold text-cobalt underline-offset-2 hover:underline">
                  showcase
                </Link>
                , but we will only feature your footage or finished video with your written
                permission. You own your finished videos.
              </p>
            </Section>

            <Section title="Who we share it with">
              <p>
                We use a small number of service providers to run Loopgrain. They only get what
                they need to do their job:
              </p>
              <ul>
                <li>
                  <strong>Stripe</strong> processes payments.
                </li>
                <li>
                  <strong>Cloudflare</strong> stores your uploaded clips and finished videos.
                </li>
                <li>
                  <strong>Neon</strong> hosts our database (your account details, orders, and
                  project notes).
                </li>
                <li>
                  <strong>Google Analytics</strong> measures how the site is used.
                </li>
                <li>
                  <strong>Our website hosting provider</strong> serves the site and processes
                  requests to it.
                </li>
              </ul>
              <p>
                We may also share information if the law requires it, or with a buyer if
                Loopgrain is ever sold, in which case this policy would continue to apply to your
                data.
              </p>
            </Section>

            <Section title="Cookies">
              <ul>
                <li>
                  <strong>Sign-in cookie.</strong> Keeps you logged in. The site can&apos;t work
                  without it.
                </li>
                <li>
                  <strong>Analytics cookies.</strong> Set by Google Analytics to count visits and
                  tell new visitors from returning ones. If you&apos;re in the EU, UK, or
                  Switzerland, these are only set after you click Accept. Elsewhere they&apos;re on
                  unless you click Decline. When they&apos;re off, Google Analytics still receives
                  basic, anonymous page visit information without cookies.
                </li>
                <li>
                  <strong>Your cookie choice</strong> is saved in your browser so we don&apos;t
                  ask again.
                </li>
              </ul>
              <p>
                You can change your choice any time:{" "}
                <CookieSettingsButton className="font-semibold text-cobalt underline-offset-2 hover:underline" />
                . You can also block cookies in your browser settings, or install Google&apos;s{" "}
                <a
                  href="https://tools.google.com/dlpage/gaoptout"
                  className="font-semibold text-cobalt underline-offset-2 hover:underline"
                >
                  Analytics opt-out add-on
                </a>
                .
              </p>
            </Section>

            <Section title="How long we keep it">
              <ul>
                <li>
                  <strong>Raw clips</strong> are deleted {RAW_CLIP_RETENTION_DAYS} days after your
                  final video is delivered.
                </li>
                <li>
                  <strong>Finished videos, project notes, and account details</strong> are kept
                  while your account is open, so you can download your videos again. Ask us and
                  we&apos;ll delete them sooner.
                </li>
                <li>
                  <strong>Payment records</strong> are kept as long as tax and accounting rules
                  require, even after an account is deleted.
                </li>
                <li>
                  <strong>Analytics data</strong> is kept by Google Analytics for up to 14 months.
                </li>
              </ul>
            </Section>

            <Section title="Your choices and rights">
              <p>You can ask us to:</p>
              <ul>
                <li>Send you a copy of the personal information we hold about you.</li>
                <li>Correct anything that&apos;s wrong.</li>
                <li>Delete your account, footage, and videos.</li>
              </ul>
              <p>
                Email {contact} and we&apos;ll respond within 30 days. Depending on where you
                live, you may have other rights under local law, and we&apos;ll honor them.
              </p>
            </Section>

            <Section title="Security">
              <p>
                Connections to Loopgrain are encrypted, passwords are hashed, and your files are
                only reachable through short-lived, private links. No system is perfectly secure,
                but if we ever learn of a breach affecting your information, we&apos;ll tell you.
              </p>
            </Section>

            <Section title="Children">
              <p>
                Loopgrain is a service for businesses and isn&apos;t meant for anyone under 18.
                We don&apos;t knowingly collect information from children.
              </p>
            </Section>

            <Section title="Changes and contact">
              <p>
                If we change this policy, we&apos;ll update the date at the top, and we&apos;ll
                email you about any significant changes. Questions? Email {contact}.
              </p>
            </Section>
          </div>
        </article>
      </main>

      <SiteFooter />
    </>
  );
}
