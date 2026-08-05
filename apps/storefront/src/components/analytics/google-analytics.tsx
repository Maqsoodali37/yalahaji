import Script from 'next/script'
import { GA_MEASUREMENT_ID, isAnalyticsEnabled, CONSENT_STORAGE_KEY } from '@/lib/analytics'
import { PageViewTracker } from './page-view-tracker'

/**
 * Mounts gtag.js with Consent Mode v2.
 *
 * Renders nothing at all when NEXT_PUBLIC_GA_MEASUREMENT_ID is unset — no
 * script tag, no dataLayer, no network request. That keeps dev and preview
 * builds out of the property without needing a separate GA config.
 *
 * Order matters: Google requires the `consent default` command to be in the
 * dataLayer *before* gtag.js executes. If it lands afterwards the first hit is
 * sent with full storage granted, which is the exact cookie-before-consent
 * problem the banner exists to avoid.
 *
 * That first block is a plain <script>, not next/script. `beforeInteractive`
 * is only honoured in the true root layout, and this app's root layout is a
 * passthrough — the <html> tree lives in [locale]/layout.tsx. A raw inline
 * script in <head> is unconditionally synchronous, so the ordering holds
 * without depending on where next/script decides to hoist it.
 */
export function GoogleAnalytics() {
  if (!isAnalyticsEnabled) return null

  const consentDefault = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
var stored = null;
try { stored = window.localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)}); } catch (e) {}
var granted = stored === 'granted' ? 'granted' : 'denied';
gtag('consent', 'default', {
  ad_storage: granted,
  ad_user_data: granted,
  ad_personalization: granted,
  analytics_storage: granted,
  functionality_storage: 'granted',
  security_storage: 'granted',
  wait_for_update: 500
});
gtag('js', new Date());
`.trim()

  return (
    <>
      {/*
        Reads the stored decision synchronously, so a returning visitor who
        already accepted is not downgraded to denied for the first hit of every
        session.
      */}
      <script
        id="ga-consent-default"
        dangerouslySetInnerHTML={{ __html: consentDefault }}
      />

      <Script
        id="ga-script"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />

      <Script id="ga-config" strategy="afterInteractive">
        {`
gtag('config', ${JSON.stringify(GA_MEASUREMENT_ID)}, {
  send_page_view: false,
  anonymize_ip: true
});
        `.trim()}
      </Script>

      {/*
        send_page_view is off above, so every page_view — including the first —
        comes from here. App Router client navigations never re-run gtag.js,
        so the automatic hit would only ever fire on a hard load.
      */}
      <PageViewTracker />
    </>
  )
}
