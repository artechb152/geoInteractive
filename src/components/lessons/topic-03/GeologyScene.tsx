'use client';

import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { GeologyTerrain } from './GeologyTerrain';

export function GeologyScene() {
  return (
    <section id="scene-geology" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader underline title={<>כדי להבין שטח —<br />צריך להבין ממה הוא בנוי</>} intro={'גיאולוגיה היא ״תורת הסלע״. היא מסבירה איך נוצר החומר שמתחת לרגליים ואיך הוא מעצב את ההרים והעמקים שמעליו.'} />
      <SurfaceCard className="overflow-hidden">
        <div className="grid lg:grid-cols-2">
          <div className="p-6 flex flex-col justify-center gap-6">
            <article>
              <div className="flex items-center gap-3 mb-4">
                <span className="size-9 rounded-xl flex items-center justify-center bg-brand-dark text-bg-elevated shrink-0"><Icon name="layers" size={20} /></span>
                <h3 className="font-display font-bold leading-tight text-black text-base md:text-lg">למה זה קריטי?</h3>
              </div>
              <h4 className="text-base font-display font-bold text-black mb-1.5">סוג הסלע = הצלחת המשימה</h4>
              <p className="text-base leading-relaxed text-black">סוג הסלע קובע אם הכוח שלך ייתקע בבוץ אחרי הגשם הראשון, אם תוכל לחפור עמדות הגנה יציבות, ואם השטח עביר לטנקים או רק ללוחמים רגליים.</p>
            </article>
            <article className="border-t border-border pt-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="size-9 rounded-xl flex items-center justify-center border border-border bg-bg-accent text-brand-dark shrink-0"><Icon name="crosshair" size={20} /></span>
                <h3 className="font-display font-bold leading-tight text-black text-base md:text-lg">מה זה משנה בפועל?</h3>
              </div>
              <h4 className="text-base font-display font-bold text-black mb-1.5">מניחוש להחלטה מבצעית חכמה</h4>
              <p className="text-base leading-relaxed text-black">הבנת המסלע הופכת ניחוש להחלטה: איפה לבסס בונקרים, איפה לנוע, איפה להניח גשר ואיפה לחפור מארב. בלי זה — אתה מתכנן באוויר.</p>
            </article>
          </div>
          <div className="relative bg-bg-accent bg-grid-pattern bg-grid flex flex-col justify-center p-6 border-s border-border">
            <GeologyTerrain mode="structure" />
            <div className="grid grid-cols-3 gap-3 border-t border-brand/20 pt-6">
              {(['תנועה', 'מיגון', 'חפירה'] as const).map((label, i) => <div key={label} className="flex flex-col items-center gap-3 text-brand-dark"><Icon name={(['tank', 'shield', 'layers'] as const)[i]} size={24} /><span className="text-base font-display font-bold text-black">{label}</span></div>)}
            </div>
          </div>
        </div>
      </SurfaceCard>
    </section>
  );
}
