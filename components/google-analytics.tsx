import Script from "next/script";
import { CONSENT_KEY, OPT_IN_REGIONS } from "@/lib/analytics";

// Loads GA with Google Consent Mode. Analytics cookies start off in
// OPT_IN_REGIONS and on elsewhere; a choice made in the cookie banner overrides
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
