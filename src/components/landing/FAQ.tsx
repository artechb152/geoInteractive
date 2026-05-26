'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { Plus } from 'lucide-react';
import { Reveal } from './Reveal';
import { cn } from '@/lib/utils';
import { lessons, totalDuration } from '@/lib/lessons';

const HOURS = Math.round(totalDuration / 60);
const COUNT = lessons.length;

const FAQS: { q: string; a: string }[] = [
  {
    q: 'למי הקורס מיועד?',
    a: 'הקורס מיועד לקצינים, מפקדים, אנליסטים מודיעיניים ולכל מי שמתעניין בהשפעת המרחב הפיזי על אסטרטגיה, תמרון ואיסוף מודיעין. אין צורך בידע מוקדם — הקורס בנוי בהדרגה מהבסיס.',
  },
  {
    q: 'כמה זמן לוקח לעבור על הקורס?',
    a: `${COUNT} שיעורים, סה"כ כ-${HOURS} שעות לימוד ותרגול. הקצב גמיש — שיעור אחד ביום או כמה שיעורים בערב. ההתקדמות נשמרת אוטומטית, אז אפשר לעצור ולחזור בלי לאבד מקום.`,
  },
  {
    q: 'האם הקורס מתאים למתחילים מוחלטים?',
    a: 'כן. שלושת השיעורים הראשונים בונים את היסוד התיאורטי — מהי גיאוגרפיה צבאית, מערכת קואורדינטות, וקריאת מפה — לפני שעוברים לנושאים מתקדמים כמו GEOINT, חישה מרחוק וניתוח שטח מבצעי.',
  },
  {
    q: 'מה בעצם כולל כל שיעור?',
    a: 'כל שיעור משלב לימוד מבוסס-תרחיש, סימולציה אינטראקטיבית של המושג הנלמד, תרגול עם משוב מיידי, וסיכום של היישום המבצעי. אין וידאו פסיבי — אתה משתתף לאורך כל הדרך.',
  },
  {
    q: 'האם אקבל תעודה בסיום?',
    a: 'בסיום הקורס תקבל תעודת השלמה. בנוסף, תצא עם פורטפוליו של תרגילי GEOINT וניתוח שטח שעברת — חומר אמיתי שניתן להציג.',
  },
  {
    q: 'מתי מתחיל הקורס? עד מתי הגישה המוקדמת פתוחה?',
    a: 'הגישה המוקדמת פתוחה כרגע — תוכל להתחיל מיד עם ההרשמה. אין תאריך פתיחה קבוע. הגישה לקורס נשארת זמינה ללא הגבלת זמן, גם אחרי שתסיים.',
  },
];

export function FAQ() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="relative py-10 md:py-14">
      <div className="max-w-3xl mx-auto px-6">
        <Reveal className="max-w-2xl">
          <span className="inline-flex items-center gap-2.5 text-sm md:text-[15px] font-display font-semibold tracking-wider text-fg-muted mb-5">
            <span className="size-2 rounded-full bg-brand" aria-hidden />
            03 · שאלות נפוצות
          </span>
          <h2
            id="faq-title"
            className="font-display font-bold tracking-tight text-balance leading-[1.1] text-[clamp(1.5rem,3vw,2.25rem)]"
          >
            כל מה שצריך לדעת
            <br className="hidden sm:block" />
            <span className="text-accent-hover">לפני שמתחילים</span>.
          </h2>
          <p className="mt-3 text-sm md:text-base text-fg-muted leading-relaxed text-pretty">
            אספנו את השאלות שמגיעות הכי הרבה לפני ההצטרפות לקורס.
          </p>
        </Reveal>

        <Reveal>
          <AccordionPrimitive.Root
            type="single"
            collapsible
            className="mt-8 flex flex-col gap-2"
          >
            {FAQS.map((item, i) => (
              <AccordionPrimitive.Item
                key={i}
                value={`q-${i}`}
                className={cn(
                  'group relative overflow-hidden rounded-xl border border-border bg-bg-elevated',
                  'transition-all duration-300 ease-snap',
                  'data-[state=open]:border-brand/40',
                )}
              >
                {/* Active indicator: vertical bar on the RTL start (right) edge */}
                <div
                  aria-hidden
                  className={cn(
                    'absolute right-0 top-0 bottom-0 w-1 bg-brand-dark origin-top scale-y-0',
                    'transition-transform duration-300 ease-snap',
                    'group-data-[state=open]:scale-y-100',
                  )}
                />

                <AccordionPrimitive.Header className="flex">
                  <AccordionPrimitive.Trigger
                    className={cn(
                      'w-full px-4 py-3.5 md:px-5 md:py-4 text-right flex items-center gap-4',
                      'transition-colors duration-200',
                      'hover:bg-bg-accent/40 focus-visible:outline-none focus-visible:bg-bg-accent/50',
                      'group-data-[state=open]:pb-3 group-data-[state=open]:hover:bg-transparent',
                    )}
                  >
                    <span className="font-display font-bold text-sm tracking-wider text-fg-dim shrink-0 group-data-[state=open]:text-brand-dark transition-colors">
                      Q·{String(i + 1).padStart(2, '0')}
                    </span>

                    <span
                      className={cn(
                        'flex-1 min-w-0 font-display font-semibold text-[15px] md:text-base leading-snug text-balance',
                        'text-fg transition-colors duration-200',
                        'group-data-[state=open]:text-brand-dark',
                      )}
                    >
                      {item.q}
                    </span>

                    <span
                      className={cn(
                        'grid place-items-center size-9 shrink-0 rounded-full',
                        'border border-border text-fg-dim bg-bg-elevated',
                        'transition-all duration-300 ease-snap',
                        'group-hover:border-brand/40 group-hover:text-brand',
                        'group-data-[state=open]:bg-brand/10 group-data-[state=open]:border-brand/40 group-data-[state=open]:text-brand-dark',
                      )}
                    >
                      <Plus
                        className="size-4 transition-transform duration-300 ease-snap group-data-[state=open]:rotate-45"
                        aria-hidden
                      />
                    </span>
                  </AccordionPrimitive.Trigger>
                </AccordionPrimitive.Header>

                <AccordionPrimitive.Content
                  className={cn(
                    'overflow-hidden text-sm md:text-[15px]',
                    'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
                  )}
                >
                  <div className="px-4 md:px-5 pb-3.5 md:pb-4 pt-1 text-fg-muted leading-relaxed text-pretty">
                    {/* Indent to align with question text, past the Q·NN gutter */}
                    <div className="pr-[3.25rem] md:pr-[3.5rem]">{item.a}</div>
                  </div>
                </AccordionPrimitive.Content>
              </AccordionPrimitive.Item>
            ))}
          </AccordionPrimitive.Root>
        </Reveal>

      </div>
    </section>
  );
}
