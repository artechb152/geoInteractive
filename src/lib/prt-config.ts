/**
 * Configuration for the secret /prt prototype-review area.
 *
 * This whole area is a "soft secret": it lives at a URL that is not
 * linked anywhere on the public site and is marked `noindex`, and it is
 * gated by a client-side password. Because the site is a static export
 * (`output: 'export'`, hosted on Vercel) there is no server to check the
 * password against — the check happens in the browser. A determined
 * person reading the bundle can find the password; that is an accepted
 * trade-off for a low-friction internal sharing page.
 */

/** Password required to enter /prt. */
export const PRT_PASSWORD = 'matan';

/** How long a successful unlock stays valid on the device, in hours. */
export const PRT_SESSION_HOURS = 24;

/** localStorage key holding the unlock timestamp. */
export const PRT_AUTH_KEY = 'prt:auth';

/**
 * Google Apps Script web-app endpoint that receives notes and appends
 * them to your Google Sheet. Deploy the script (see the setup notes you
 * were given) and paste its `…/exec` URL here — it is a write-only
 * endpoint, not a secret, so committing it is fine. You can also override
 * it at build time with NEXT_PUBLIC_NOTES_ENDPOINT (e.g. a Vercel env var).
 */
export const NOTES_ENDPOINT =
  process.env.NEXT_PUBLIC_NOTES_ENDPOINT || '';
