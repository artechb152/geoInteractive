/**
 * FeaturesRow — ארבעת כרטיסי היתרונות (design/mockup.png, פס אמצעי).
 * הילד הראשון = הכרטיס הימני ב-RTL ("מפות אינטראקטיביות" במוקאפ).
 * האיורים כאן הם קירובי SVG שטוחים — יוחלפו בנכסי papercut כשיופקו
 * (חוב נכסים: HOME-FEATURE-{MAP,COMPASS,BINOCULARS,LAYERS}).
 */

type Feature = {
  glyph: React.ReactNode;
  title: string;
  /** שתי שורות מפורשות — שבירה זהה למוקאפ */
  sub: [string, string];
};

const FEATURES: Feature[] = [
  {
    glyph: <MapGlyph />,
    title: 'מפות אינטראקטיביות',
    sub: ['מפות אינטראקטיביות', 'שמגיבות לפעולות שלך'],
  },
  {
    glyph: <CompassGlyph />,
    title: 'מיומנויות בשטח',
    sub: ['כלים מעשיים לניווט,', 'תצפית וניתוח מרחב'],
  },
  {
    glyph: <BinocularsGlyph />,
    title: 'חשיבה מבצעית',
    sub: ['הבנת המרחב', 'כמנוף להחלטות'],
  },
  {
    glyph: <LayersGlyph />,
    title: 'שכבות מידע',
    sub: ['שילוב נתונים מרובים', 'לתמונה מלאה'],
  },
];

export function FeaturesRow() {
  return (
    <section className="mt-10 grid grid-cols-4 gap-3.5">
      {FEATURES.map((f) => (
        <article
          key={f.title}
          className="flex min-h-[172px] flex-col items-center justify-center rounded-[20px] bg-paper-card px-6 py-4 text-center shadow-card-soft"
        >
          <div className="flex h-16 items-center justify-center" aria-hidden>
            {f.glyph}
          </div>
          <h3 className="mt-2 text-[19px] font-bold leading-snug text-olive-ink">{f.title}</h3>
          <p className="mt-1 text-[14.5px] leading-normal text-olive-muted">
            {f.sub[0]}
            <br />
            {f.sub[1]}
          </p>
        </article>
      ))}
    </section>
  );
}

/* ── קירובי איורים שטוחים בסגנון papercut ────────────────────────────── */

function LayersGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 80 64" className="h-14 w-auto">
      <g>
        <path d="M40 34 L72 46 L40 58 L8 46 Z" fill="#8A9163" />
        <path d="M40 22 L72 34 L40 46 L8 34 Z" fill="#6E7A4E" stroke="#F3E9DC" strokeWidth="1.5" />
        <path d="M40 10 L72 22 L40 34 L8 22 Z" fill="#55613C" stroke="#F3E9DC" strokeWidth="1.5" />
        <path d="M40 10 L72 22 L40 34 L8 22 Z" fill="#7A8A4F" opacity="0.85" />
      </g>
    </svg>
  );
}

function BinocularsGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 80 64" className="h-14 w-auto">
      <rect x="10" y="14" width="24" height="40" rx="10" fill="#55613C" />
      <rect x="46" y="14" width="24" height="40" rx="10" fill="#55613C" />
      <rect x="14" y="18" width="16" height="12" rx="6" fill="#7A8A4F" />
      <rect x="50" y="18" width="16" height="12" rx="6" fill="#7A8A4F" />
      <rect x="32" y="26" width="16" height="10" rx="4" fill="#6E7A4E" />
      <circle cx="22" cy="46" r="7" fill="#38432E" />
      <circle cx="58" cy="46" r="7" fill="#38432E" />
    </svg>
  );
}

function CompassGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 72 72" className="h-14 w-auto">
      <circle cx="36" cy="38" r="28" fill="#55613C" />
      <circle cx="36" cy="38" r="22" fill="#E8DCC4" />
      <circle cx="36" cy="38" r="22" fill="none" stroke="#8A9163" strokeWidth="2" />
      <path d="M36 22 L42 40 L36 36 L30 40 Z" fill="#D97E2B" />
      <path d="M36 54 L40 42 L36 44 L32 42 Z" fill="#8A8873" />
      <circle cx="36" cy="38" r="2.5" fill="#38432E" />
      <rect x="30" y="2" width="12" height="8" rx="3" fill="#6E7A4E" />
    </svg>
  );
}

function MapGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 84 64" className="h-14 w-auto">
      <g stroke="#C9B892" strokeWidth="1">
        <path d="M8 20 L28 12 L28 52 L8 60 Z" fill="#E8DCC4" />
        <path d="M28 12 L48 20 L48 60 L28 52 Z" fill="#D8CBAA" />
        <path d="M48 20 L68 12 L68 52 L48 60 Z" fill="#E8DCC4" />
      </g>
      <g stroke="#8A9163" strokeWidth="1.5" fill="none" opacity="0.8">
        <path d="M12 32 C 18 28, 22 34, 26 30" />
        <path d="M32 26 C 38 22, 42 30, 46 26" />
        <path d="M52 32 C 58 28, 62 34, 66 30" />
      </g>
      <line x1="60" y1="8" x2="60" y2="24" stroke="#8A8873" strokeWidth="2" />
      <path d="M60 8 L74 12 L60 17 Z" fill="#D97E2B" />
    </svg>
  );
}
