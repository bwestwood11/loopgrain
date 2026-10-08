import Script from "next/script";
import { CONSENT_KEY } from "@/lib/analytics";

// EEA, UK and Switzerland, where analytics cookies need opt-in consent.
const OPT_IN_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
  "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO",
  "GB", "CH",
];

// Loads GA with Google Consent Mode. Analytics cookies start off in the
// regions above and on elsewhere; a choice made in the cookie banner overrides
// either. Without cookies GA still gets anonymous, cookieless pings. Ad
// storage stays off everywhere: the site doesn't run Google Ads.
export function GoogleAnalytics({ gaId }: { gaId: string }) {
  return (
    <>
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
          });
          gtag('consent', 'default', {
            analytics_storage: 'denied',
            region: ${JSON.stringify(OPT_IN_REGIONS)}
          });
          try {
            var choice = localStorage.getItem('${CONSENT_KEY}');
            if (choice === 'granted' || choice === 'denied') {
              gtag('consent', 'update', { analytics_storage: choice });
            }
          } catch (e) {}
          gtag('js', new Date());
          gtag('config', ${JSON.stringify(gaId)});
        `}
      </Script>
      <Script
        id="ga-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
    </>
  );
}
