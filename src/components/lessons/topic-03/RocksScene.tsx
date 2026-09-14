'use client';

import { useState } from 'react';
import { SceneHeader } from './SceneHeader';
import { ROCKS, type Rock } from './geology-data';
import { Icon } from '@/components/Icon';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { FrameCorners } from '@/components/ui/FrameCorners';
import { cn } from '@/lib/utils';

// User-created photos can replace these slots without changing the layout.
function RockPhoto({ rock }: { rock: Rock }) {
  const [missing, setMissing] = useState(false);
  const src = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic03/scene-geology/${rock.id}.webp`;
  return (
    <div className="relative aspect-[4/3] bg-bg-accent bg-grid-pattern bg-grid overflow-hidden" data-rock-image={rock.id}>
      {missing ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
        <div className="size-28 rounded-full border border-brand/20 flex items-center justify-center relative">
          <div className="absolute inset-3 rounded-full border border-brand/20" />
          <Icon name="layers" size={40} className="text-brand-dark" />
        </div>
        <span className="text-base text-black">תמונת {rock.label} תתווסף כאן</span>
      </div> : (
        // eslint-disable-next-line @next/next/no-img-element -- offline static lesson assets
        <img src={src} alt={`דוגמת ${rock.label}: ${rock.examples}`} onError={() => setMissing(true)} className="absolute inset-0 size-full object-cover" />
      )}
      <FrameCorners className="inset-4" />
    </div>
  );
}

export function RocksScene() {
  const [selected, setSelected] = useState<Rock['id']>('sediment');
  const rock = ROCKS.find(item => item.id === selected)!;
  return (
    <section id="scene-rocks" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader underline title="3 סוגי סלעים. שלושה סיפורים שונים." intro="כל הסלעים בעולם נכנסים לאחת משלוש הקבוצות האלה. בחרו סלע כדי לגלות איך נוצר ומה המשמעות שלו בשטח." />
      <div className="grid sm:grid-cols-3 gap-4 mb-6" role="group" aria-label="בחירת סוג סלע">
        {ROCKS.map((item, i) => <button key={item.id} type="button" aria-pressed={selected === item.id} aria-controls="rock-detail" onClick={() => setSelected(item.id)} className={cn('surface overflow-hidden text-start transition-all duration-300 ease-snap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-dark', selected === item.id ? 'border-brand-dark ring-2 ring-brand-dark/20 bg-bg-elevated' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]')}>
          <RockPhoto rock={item} />
          <div className="p-4 flex items-center gap-3 border-t border-border">
            <span className={cn('size-9 rounded-xl flex items-center justify-center shrink-0 border font-display font-bold', selected === item.id ? 'bg-brand-dark text-bg-elevated border-brand-dark' : 'bg-bg-accent text-fg-muted border-border')}>{i + 1}</span>
            <div className="flex-1"><h3 className="font-display font-bold leading-tight text-black text-base md:text-lg">{item.label}</h3><p className="text-base leading-relaxed text-black mt-1">{item.examples}</p></div>
            {selected === item.id && <Icon name="check" size={20} className="text-brand-dark" />}
          </div>
        </button>)}
      </div>
      <SurfaceCard className="p-6" as="article">
        <div id="rock-detail" aria-live="polite" aria-atomic="true" className="grid md:grid-cols-2 gap-6">
          <div><h4 className="text-base font-display font-bold text-black mb-1.5 flex items-center gap-3"><Icon name="layers" size={20} className="text-brand-dark" />{rock.label} — איך נוצר?</h4><p className="text-base leading-relaxed text-black">{rock.description}</p></div>
          <div className="md:border-s border-border md:ps-6"><h4 className="text-base font-display font-bold text-black mb-1.5 flex items-center gap-3"><Icon name="crosshair" size={20} className="text-brand-dark" />המשמעות הצבאית</h4><p className="text-base leading-relaxed text-black">{rock.military}</p></div>
        </div>
      </SurfaceCard>
    </section>
  );
}
