'use client';

import { useState } from 'react';
import { SceneHeader } from './SceneHeader';
import { GeologyTerrain } from './GeologyTerrain';
import { FORCES, type Force } from './geology-data';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

export function GeologyForcesScene() {
  const [selected, setSelected] = useState<Force['id']>('endo');
  const force = FORCES.find(item => item.id === selected)!;
  return (
    <section id="scene-geology-forces" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader underline title={<>2 כוחות שמעצבים<br />כל הר בכוכב הזה</>} intro="מבפנים — כוחות שבונים ומרימים. מבחוץ — כוחות שמבלים ושוחקים. בחרו כוח וראו היכן הוא פועל." />
      <SurfaceCard className="overflow-hidden">
        <div className="grid lg:grid-cols-2">
          <div className="p-6">
            <div role="group" aria-label="בחירת כוח מעצב" className="grid grid-cols-2 gap-3 mb-6">
              {FORCES.map((item, i) => <button key={item.id} type="button" onClick={() => setSelected(item.id)} aria-pressed={selected === item.id} aria-controls="force-detail" className={cn('surface p-4 text-start transition-all duration-300 ease-snap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-dark', selected === item.id ? 'border-brand/45 bg-bg-elevated ring-2 ring-brand-dark/20' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]')}>
                <span className={cn('size-9 rounded-xl flex items-center justify-center shrink-0 border mb-3', selected === item.id ? 'bg-brand-dark text-bg-elevated border-brand-dark' : 'bg-bg-accent text-fg-muted border-border')}><Icon name={item.icon} size={20} /></span>
                <span className="block font-display font-bold leading-tight text-black text-base md:text-lg">{i === 0 ? 'הכוחות הבונים' : 'הכוחות המפסלים'}</span>
                <span className="block text-base leading-relaxed text-black mt-1">{i === 0 ? 'מבפנים · אנדוגניים' : 'מבחוץ · אקסוגניים'}</span>
              </button>)}
            </div>
            <div id="force-detail" aria-live="polite" aria-atomic="true">
              <h3 className="font-display font-bold leading-tight text-black text-base md:text-lg mb-3">{force.label}</h3>
              <p className="text-base leading-relaxed text-black">{force.what}</p>
              <h4 className="text-base font-display font-bold text-black mt-6 mb-3">דוגמאות בנוף</h4>
              <ul className="grid grid-cols-2 gap-3">{force.examples.map(example => <li key={example} className="flex items-start gap-2 text-base leading-relaxed text-black"><Icon name="check" size={16} className="text-brand-dark shrink-0 mt-1" />{example}</li>)}</ul>
            </div>
          </div>
          <figure className="bg-bg-accent bg-grid-pattern bg-grid p-6 border-s border-border flex flex-col justify-center">
            <GeologyTerrain mode={selected} />
            <figcaption className="text-base leading-relaxed text-black text-center border-t border-brand/20 pt-4">{selected === 'endo' ? 'הכוחות הפנימיים דוחפים מלמטה ובונים את מבנה ההר.' : 'הכוחות החיצוניים פועלים על פני השטח ושוחקים את ההר.'}</figcaption>
          </figure>
        </div>
      </SurfaceCard>
      <SurfaceCard as="aside" className="mt-6 p-6 overflow-hidden">
        <div className="absolute inset-y-0 start-0 w-1 bg-brand-dark" aria-hidden />
        <div className="flex gap-4 items-start">
          <span className="size-9 rounded-xl flex items-center justify-center bg-bg-accent border border-border text-brand-dark shrink-0"><Icon name="scale" size={20} /></span>
          <div><h3 className="font-display font-bold leading-tight text-black text-base md:text-lg mb-2">בשורה התחתונה</h3><p className="text-base leading-relaxed text-black">הנוף הוא ״מאבק״ תמידי: הכוחות הפנימיים דוחפים למעלה ובונים הרים, בעוד הכוחות החיצוניים שוחקים אותם. סוג הסלע משפיע על קצב השינוי — ועל השטח שנפגוש.</p></div>
        </div>
      </SurfaceCard>
    </section>
  );
}
