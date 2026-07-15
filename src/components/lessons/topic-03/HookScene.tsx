'use client';

import { motion } from 'framer-motion';

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[calc(100dvh-var(--header-h)-5rem)] relative flex items-center overflow-hidden"
    >
      <BackdropTerrain />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md ms-[6vw] sm:ms-[10vw] lg:ms-[13vw] px-6 text-start"
      >
        <h1 className="text-[clamp(2.1rem,4.6vw,3.5rem)] font-bold tracking-tight text-balance leading-[1.15] text-fg">
          להגיע ליעד בדיוק מושלם,
          <br />
          גם כשהטכנולוגיה מפסיקה לעבוד.
        </h1>

        <div className="mt-5 flex items-center gap-3 justify-end" aria-hidden>
          <span className="h-px flex-1 bg-border-strong/50" />
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-fg-dim shrink-0">
            <path d="M12 2 14 10 22 12 14 14 12 22 10 14 2 12 10 10Z" />
          </svg>
        </div>

        <p className="mt-5 text-fg-muted text-base sm:text-lg leading-relaxed text-pretty">
          לוויינים נופלים. רחפנים מאבדים אות. האויב משבש את ה-GPS.
          ניווט הוא לא רק טכניקה — זאת היכולת שמחזירה את הכוח שלך הביתה.
        </p>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="mt-10 flex justify-end"
        >
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('learn:next'))}
            className="inline-flex items-center gap-3 px-7 py-3.5 rounded-xl bg-accent text-bg-elevated font-display font-semibold text-base hover:bg-accent-hover transition-all duration-200 shadow-cta-ember"
            aria-label="התחל את השיעור"
          >
            <span>לחץ כדי להתחיל</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}

/**
 * Full cartographic-field backdrop: a coordinate-grid map with axis tick
 * labels, a large azimuth compass rose, a dashed route running to a
 * concentric-ring target, and N-arrow + scale-bar map furniture in the
 * corner. Every element sits on fg-dim/border/accent tones already in the
 * palette — no new hex. All decorative, aria-hidden.
 */
function BackdropTerrain() {
  const CONTOURS = [
    'M -38 -2 C -32 -22, -10 -32, 10 -28 S 36 -8, 34 14 S 12 36, -8 30 S -42 16, -38 -2 Z',
    'M -28 -1 C -23 -16, -7 -23, 8 -20 S 27 -5, 25 11 S 9 27, -5 22 S -31 12, -28 -1 Z',
    'M -19 -0.5 C -16 -11, -5 -16, 6 -14 S 19 -3, 17 8 S 6 19, -3 15 S -22 8, -19 -0.5 Z',
    'M -11 0 C -9 -6, -3 -9, 3 -8 S 11 -1, 10 5 S 3 12, -2 9 S -13 5, -11 0 Z',
  ];

  // Coordinate-grid verticals/horizontals with map-reference tick labels.
  const EASTINGS = [232, 233, 234, 235, 236, 237];
  const NORTHINGS = [7424, 7423, 7422, 7421];

  // Compass-rose ticks, every 30°, 0 at top (N) — same azimuth convention
  // used by the interactive dial in PrinciplesScene, just static here.
  const TICKS = Array.from({ length: 12 }, (_, i) => i * 30);

  // Route: small origin dot (lower-start of the field) climbing on the
  // start/left side, then cutting across ABOVE the H1 text block (which
  // sits roughly mid-height in the end/right column) so the dashed line
  // never crosses the headline — hand-drawn wavy path, not a straight line.
  const ROUTE_D = 'M 18 56 C 22 50, 20 40, 26 32 S 30 20, 34 13 S 55 9, 78 11';

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        viewBox="0 0 100 62.5"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <pattern id="hookGrid" width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="0" cy="0" r="0.16" className="fill-fg-dim" opacity="0.3" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100" height="62.5" fill="url(#hookGrid)" />

        {/* ——— Coordinate grid + axis ticks (map furniture) ——— */}
        <g className="stroke-border-strong" strokeWidth="0.08" opacity="0.4">
          {EASTINGS.map((v, i) => {
            const x = 12 + i * 16;
            return <line key={v} x1={x} y1="9" x2={x} y2="59" />;
          })}
          {NORTHINGS.map((v, i) => {
            const y = 9 + i * 14;
            return <line key={v} x1="4" y1={y} x2="96" y2={y} />;
          })}
        </g>
        <g className="fill-fg-dim text-fg-dim" fontSize="1.5" fontFamily="var(--font-display), system-ui, sans-serif" fontWeight={600}>
          {EASTINGS.map((v, i) => (
            <text key={v} x={12 + i * 16} y="6.5" textAnchor="middle">{v}000</text>
          ))}
          {NORTHINGS.map((v, i) => (
            <text key={v} x="7.5" y={9 + i * 14 - 1} textAnchor="start">{v}000</text>
          ))}
        </g>

        {/* ——— Faint organic contour rings (kept from original treatment) ——— */}
        <g transform="translate(28 26) scale(0.32)">
          {CONTOURS.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              fill="none"
              className="stroke-fg-dim"
              strokeWidth="0.55"
              opacity={0.22 - i * 0.035}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.22 - i * 0.035 }}
              transition={{ duration: 2.4, delay: i * 0.18, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </g>

        {/* ——— Giant pale "03" lesson numeral ——— */}
        <text
          x="12"
          y="26"
          className="fill-border-strong"
          opacity="0.55"
          fontSize="18"
          fontWeight={800}
          fontFamily="var(--font-display), system-ui, sans-serif"
        >
          03
        </text>

        {/* ——— Compass rose (static, azimuth-ring convention) ——— */}
        <g transform="translate(27 41)">
          <circle r="15.5" fill="none" className="stroke-border-strong" strokeWidth="0.18" opacity="0.55" />
          <circle r="11.5" fill="none" className="stroke-border-strong" strokeWidth="0.12" opacity="0.4" />
          {TICKS.map((deg) => {
            const a = ((deg - 90) * Math.PI) / 180;
            const isCardinal = deg % 90 === 0;
            const r1 = isCardinal ? 12.6 : 13.6;
            return (
              <line
                key={deg}
                x1={Math.cos(a) * r1}
                y1={Math.sin(a) * r1}
                x2={Math.cos(a) * 15.5}
                y2={Math.sin(a) * 15.5}
                className="stroke-border-strong"
                strokeWidth={isCardinal ? 0.22 : 0.12}
                opacity="0.6"
              />
            );
          })}
          {TICKS.map((deg) => {
            const a = ((deg - 90) * Math.PI) / 180;
            return (
              <text
                key={'l' + deg}
                x={Math.cos(a) * 17.4}
                y={Math.sin(a) * 17.4 + 0.6}
                textAnchor="middle"
                className="fill-fg-dim"
                fontSize="1.4"
                fontWeight={600}
                fontFamily="var(--font-display), system-ui, sans-serif"
              >
                {deg}
              </text>
            );
          })}
          {/* cross hairlines through center */}
          <line x1="-15.5" y1="0" x2="15.5" y2="0" className="stroke-border-strong" strokeWidth="0.1" opacity="0.4" />
          <line x1="0" y1="-15.5" x2="0" y2="15.5" className="stroke-border-strong" strokeWidth="0.1" opacity="0.4" />
          {/* 4-point center star */}
          <path d="M0 -3 L0.6 -0.6 L3 0 L0.6 0.6 L0 3 L-0.6 0.6 L-3 0 L-0.6 -0.6 Z" className="fill-fg-dim" opacity="0.5" />
        </g>

        {/* ——— Dashed route + target bullseye ——— */}
        <motion.path
          d={ROUTE_D}
          fill="none"
          className="stroke-accent"
          strokeWidth="0.3"
          strokeLinecap="round"
          strokeDasharray="1 1.9"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ duration: 1.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
        <polygon points="1.3,0 -0.75,-0.75 -0.75,0.75" transform="translate(76.3 11.2) rotate(-6)" className="fill-accent" opacity="0.9" />
        <g transform="translate(18 56)">
          <circle r="1" className="fill-fg" opacity="0.7" />
          <circle r="1" fill="none" className="stroke-fg" strokeWidth="0.15" opacity="0.4" />
        </g>
        <g transform="translate(78 11)">
          {[6.5, 4.4, 2.3].map((r, i) => (
            <circle key={i} r={r} fill="none" className="stroke-accent" strokeWidth="0.28" opacity={0.55 - i * 0.1} />
          ))}
          <circle r="1" className="fill-accent" />
        </g>

        {/* ——— N-arrow + scale bar (bottom-end map furniture) ——— */}
        <g transform="translate(90 51)" className="text-fg-muted">
          <line x1="0" y1="2.6" x2="0" y2="-1.6" className="stroke-fg-muted" strokeWidth="0.18" />
          <polygon points="0,-2.3 -0.65,-1.1 0.65,-1.1" className="fill-fg-muted" />
          <text x="0" y="5.1" textAnchor="middle" fontSize="1.5" fontWeight={700} className="fill-fg-muted" fontFamily="var(--font-display), system-ui, sans-serif">N</text>
        </g>
        <g transform="translate(65 59)" className="text-fg-dim">
          <line x1="0" y1="0" x2="24" y2="0" className="stroke-fg-dim" strokeWidth="0.25" opacity="0.7" />
          {[0, 6, 12, 18, 24].map((x) => (
            <line key={x} x1={x} y1="-0.6" x2={x} y2="0.6" className="stroke-fg-dim" strokeWidth="0.2" opacity="0.7" />
          ))}
          {['0', '250', '500', '750', '1000 מ׳'].map((label, i) => (
            <text key={label} x={i * 6} y="3" textAnchor="middle" fontSize="1.3" className="fill-fg-dim" fontFamily="var(--font-display), system-ui, sans-serif">
              {label}
            </text>
          ))}
        </g>
      </svg>

      {/* Soft vignette start-side so the text column keeps full contrast */}
      <div className="absolute inset-y-0 start-0 w-[42%] bg-gradient-to-l from-transparent to-bg/40" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-bg to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
