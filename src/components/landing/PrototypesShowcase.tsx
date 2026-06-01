/**
 * Landing-page section that surfaces the two prototypes the user
 * is testing for proof-of-concept (terrain simulator + terrain
 * overlay). Each card embeds the prototype via an iframe and matches
 * the site's design language (orange eyebrow, surface-elevated card,
 * brand typography). The prototype internals are untouched — only the
 * surrounding chrome.
 *
 * To swap in the live URLs, replace the placeholder values in
 * `PROTOTYPES[i].embedUrl` below with the deployed iframe-friendly
 * URLs (e.g. Vercel preview deploys or GitHub Pages).
 */

type Prototype = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  /** The iframe source URL. Set to `null` to render the "placeholder"
   * card with the repo link, useful before the prototype is deployed. */
  embedUrl: string | null;
  /** Always show the GitHub repo link as a fallback / source-of-truth. */
  repoUrl: string;
  /** Aspect ratio class for the iframe wrapper. */
  aspectClass: string;
};

const PROTOTYPES: Prototype[] = [
  {
    id: 'terrain-3d',
    title: 'סימולטור שטח תלת־ממדי',
    tagline: 'ניווט וחקירה במודל גובה אינטראקטיבי',
    description:
      'פרוטוטייפ ראשוני לסביבת לימוד תלת־ממדית של שטח. מאפשר להסתובב, להזיז את זווית הצפייה ולחקור את התבליט מכל זווית — כדי לתרגל קריאת מורפולוגיה לפני יציאה בפועל לשטח.',
    embedUrl: null,
    repoUrl: 'https://github.com/idog2210/Terrain3DSimulatorTerrainPrototype01',
    aspectClass: 'aspect-[4/3] md:aspect-[16/10]',
  },
  {
    id: 'terrain-overlay',
    title: 'שכבות מידע על מפת שטח',
    tagline: 'הלבשת שכבות גיאו־מידע על מפה',
    description:
      'פרוטוטייפ ראשוני להצגת שכבות מידע (טופוגרפיה, תשתיות, איומים) על גבי מפת בסיס. מדגים את הרעיון של ניתוח מרחבי דרך הצלבת מספר שכבות שקופות בו־זמנית.',
    embedUrl: null,
    repoUrl: 'https://github.com/idog2210/TerrainOverlayPrototype01',
    aspectClass: 'aspect-[4/3] md:aspect-[16/10]',
  },
];

export function PrototypesShowcase() {
  return (
    <section
      id="prototypes"
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 border-t border-border-subtle"
      aria-labelledby="prototypes-heading"
    >
      <div className="mb-10 md:mb-12">
        <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent mb-2.5">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden />
          פרוטוטיפים · בדיקת היתכנות
        </div>
        <h2
          id="prototypes-heading"
          className="font-display font-bold text-2xl md:text-4xl text-balance leading-tight mb-2"
        >
          שני <span className="text-accent-hover">פרוטוטייפים ראשוניים</span> לבדיקה
        </h2>
        <p className="text-fg-muted text-base md:text-lg max-w-3xl">
          פיתוחים חצי־עבודה שבודקים יסודות טכניים של הקורס: סימולציית שטח תלת־ממדית
          והצגת שכבות מידע גיאו־מרחביות. נסי, סובבי, גלי איפה זה עובד ואיפה צריך עוד עבודה.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {PROTOTYPES.map((p) => (
          <article
            key={p.id}
            className="surface-elevated rounded-2xl overflow-hidden flex flex-col"
          >
            {/* Card header */}
            <div className="p-5 sm:p-6 border-b border-border-subtle">
              <div className="text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent mb-1.5">
                {p.tagline}
              </div>
              <h3 className="font-display font-bold text-xl sm:text-2xl text-balance leading-tight mb-2 text-accent-hover">
                {p.title}
              </h3>
              <p className="text-sm md:text-base text-fg leading-relaxed text-pretty">
                {p.description}
              </p>
            </div>

            {/* Embed area — fills the rest of the card and stays responsive */}
            <div className={`relative w-full bg-bg-accent/30 ${p.aspectClass}`}>
              {p.embedUrl ? (
                <iframe
                  src={p.embedUrl}
                  title={p.title}
                  className="absolute inset-0 w-full h-full border-0"
                  loading="lazy"
                  allow="fullscreen; accelerometer; gyroscope"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="text-center max-w-sm">
                    <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-fg-muted mb-2">
                      <span className="size-1.5 rounded-full bg-fg-dim" aria-hidden />
                      ממתין לפריסה (Deployment)
                    </div>
                    <p className="text-sm text-fg leading-relaxed mb-4">
                      ברגע שהפרוטוטייפ יפרוס ל-Vercel/GitHub-Pages, ההטמעה
                      תופיע כאן אוטומטית. בינתיים אפשר לעיין בקוד המקור:
                    </p>
                    <a
                      href={p.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium text-bg-elevated bg-accent hover:bg-accent-hover transition-colors text-sm"
                    >
                      פתח את הריפו ב-GitHub
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Footer — repo link always visible */}
            <div className="px-5 sm:px-6 py-3 border-t border-border-subtle flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[11px] font-display font-medium tracking-wide text-fg-dim">
                קוד מקור פתוח
              </div>
              <a
                href={p.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] font-display font-medium tracking-wide text-accent-hover hover:text-accent transition-colors truncate max-w-[60%]"
              >
                {p.repoUrl.replace('https://github.com/', '')}
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
