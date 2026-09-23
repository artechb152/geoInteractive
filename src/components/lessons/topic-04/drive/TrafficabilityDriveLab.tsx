'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { InsightCard } from '@/components/lesson/InsightCard';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { LoadingGate } from './LoadingGate';
import { preloadTerrainTextures } from './Terrain';
import { SOIL_CONFIGS, SOIL_ORDER, type SoilId } from './terrainConfigs';

/**
 * Standalone lab page for the topic-04 trafficability driving simulation.
 * Lives at /lab/trafficability-drive — not linked from the lesson yet.
 * Soil ids/copy mirror TrafficabilityScene.tsx's SOILS verbatim (that file
 * is left untouched until this is reviewed); see design/docs/assumptions.md.
 */
export function TrafficabilityDriveLab() {
  const [activeSoil, setActiveSoil] = useState<SoilId>('hard');
  const soil = SOIL_CONFIGS[activeSoil];

  // Idle-preload the other three soils' PBR textures (~500KB each) so later
  // switches are instant, without delaying the first paint/first drive.
  useEffect(() => {
    const idle = 'requestIdleCallback' in window ? window.requestIdleCallback : (cb: () => void) => setTimeout(cb, 1200);
    const handle = idle(() => {
      for (const id of SOIL_ORDER) {
        if (id !== activeSoil) preloadTerrainTextures(SOIL_CONFIGS[id]);
      }
    });
    return () => {
      if ('cancelIdleCallback' in window && typeof handle === 'number') window.cancelIdleCallback(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-2 text-sm font-display font-semibold tracking-wider text-fg-dim">
        תוסף תרגול — עבירות וניידות (שיעור 4)
      </div>
      <h1 className="mb-3 font-display text-3xl font-extrabold leading-tight text-fg md:text-4xl">
        הדמיית נהיגת שטח: <span className="gradient-text">תרגישו את ההבדל</span> בין הקרקעות
      </h1>
      <p className="mb-8 max-w-3xl text-base leading-relaxed text-fg-muted md:text-lg">
        התנסות קצרה ואופציונלית: בחרו סוג קרקע ונהגו חופשי ברכב שטח קל כדי להרגיש איך אחיזה, שקיעה
        ותנועת המתלים משתנות בין הסביבות. אין ציון ואין חובה — זו רק דרך להרגיש בגוף את מה שלמדתם למעלה.
      </p>

      {/* Soil picker — same four soil types as the lesson's SOILS section. */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SOIL_ORDER.map((id) => {
          const s = SOIL_CONFIGS[id];
          const isActive = id === activeSoil;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveSoil(id)}
              className={cn(
                'group relative overflow-hidden rounded-[4px] border-2 text-start transition-all',
                isActive ? 'border-accent shadow-elevated' : 'border-border hover:border-accent/50',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized */}
              <img
                src={`${s.visual.textureDir}/thumb.webp`}
                alt={`תצלום קרוב של ${s.label}`}
                className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                draggable={false}
              />
              {isActive && (
                <span className="absolute end-2 top-2 flex size-6 items-center justify-center rounded-full bg-accent text-white shadow-elevated">
                  <Icon name="check" size={14} strokeWidth={3} />
                </span>
              )}
              <div className="bg-bg-elevated p-2.5">
                <div className="font-display text-sm font-bold leading-tight text-fg">{s.label}</div>
                <div className="mt-0.5 font-display text-xs font-medium text-fg-dim">{s.english}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Drive area + text panel */}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-stretch">
        <div className="hidden aspect-[4/3] w-full md:block lg:aspect-auto lg:min-h-[520px]">
          <LoadingGate soil={soil} />
        </div>
        {/* Mobile / tablet: static image + text only, per the brief — no touch driving controls. */}
        <div className="aspect-[4/3] w-full overflow-hidden rounded-[4px] md:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized */}
          <img
            src={`${soil.visual.textureDir}/poster.webp`}
            alt={`תצלום קרוב של ${soil.label}`}
            className="size-full object-cover"
            draggable={false}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeSoil}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-3"
          >
            <InsightCard tone="cool" label="במילים פשוטות">
              {soil.desc}
            </InsightCard>
            <InsightCard tone="warn" label="איך זה ישפיע על הנסיעה?">
              {soil.effect}
            </InsightCard>
            <InsightCard tone="accent" label="תכל'ס, מה עושים בשטח?">
              {soil.tip}
            </InsightCard>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
