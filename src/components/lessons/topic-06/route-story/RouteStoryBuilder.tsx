'use client';
import { useId, useReducer, useRef, useEffect } from 'react';
import { Compass, Ruler, MapPin, Undo2, RotateCcw, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { LEGS, POINTS, END_LABEL, END_OPTIONS, deg, metres, TOTAL_M, type Field, type EndOption } from './routeStoryModel';
import { INITIAL_WORKBENCH, workbenchReducer, complete, routeComplete, fieldVerdict, feedback, type Tool } from './workbenchModel';
import { WorkbenchMap } from './WorkbenchMap';

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';

export function RouteStoryBuilder() {
  const [history, dispatch] = useReducer(workbenchReducer, INITIAL_WORKBENCH);
  const state = history.present;
  const { selectedLeg, selectedPoint, tool } = state;
  const { answer, checked, done } = state.legs[selectedLeg];
  const allDone = routeComplete(state);
  const completedCount = state.legs.filter(l => l.done).length;
  const leg = LEGS[selectedLeg];
  const editable = !done;
  const uid = useId();
  const statusRef = useRef<HTMLParagraphElement>(null);
  const wasDone = useRef(false);
  useEffect(() => { if (done && !wasDone.current) statusRef.current?.focus(); wasDone.current = done; }, [done]);
  const chooseTool = (next: Tool) => dispatch({ type: 'tool', tool: next });
  const chooseLeg = (index: number) => dispatch({type:'leg', index});
  const setNumber = (field: 'az' | 'm', value: string) => dispatch({ type: 'answer', field, value: value === '' ? null : Number(value) });
  const displayAz = answer.az;
  const displayM = answer.m;
  const displayEnd = answer.end ? END_LABEL[answer.end] : null;
  const status = allDone ? `סיפור הדרך הושלם: ארבעה קטעים, ${metres(TOTAL_M)} מנ.ה עד נ.ס.` : done ? 'הקטע הושלם. אפשר להמשיך לקטע הבא.' : checked ? 'בדקו את המשוב ליד כל שדה. אפשר לתקן ולבדוק שוב.' : complete(answer) ? 'הקטע מוכן לבדיקה.' : 'השלימו כיוון, מרחק וסימן כדי לבדוק את הקטע.';
  const showFeedback = (field: Field) => {
    const verdict = fieldVerdict(state, field);
    return verdict && <p data-feedback={field} data-verdict={verdict} className={cn('mt-1 text-base leading-snug', verdict === 'right' ? 'text-brand-dark' : 'text-accent-hot')}>{feedback(state, field)}</p>;
  };
  const fieldButton = (next: Tool) => cn('flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors', FOCUS, tool === next ? 'border-brand-dark bg-brand-dark text-white' : 'border-border bg-bg-accent text-fg hover:border-brand');
  const input = cn('h-11 w-full min-w-0 rounded-xl border border-border bg-bg-elevated px-3 text-center font-display text-lg tabular-nums text-black disabled:bg-bg-accent/40', FOCUS);

  return (
    <section data-qa="route-builder" data-done={allDone || undefined} data-selected-leg={selectedLeg} aria-labelledby={`${uid}-title`} className="surface-elevated p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div><h3 id={`${uid}-title`} className="font-display text-2xl font-bold leading-tight text-black">שולחן התכנון</h3><p className="mt-1 text-base text-fg-muted">חמש נקודות · {completedCount} מתוך 4 קטעים הושלמו</p></div>
        <div className="flex items-center gap-1"><Button variant="ghost" size="sm" onClick={()=>dispatch({type:'undo'})} disabled={!history.past.length}><Undo2 className="size-5" aria-hidden/>ביטול</Button><Button variant="ghost" size="sm" onClick={()=>dispatch({type:'reset'})}><RotateCcw className="size-5" aria-hidden/>איפוס</Button></div>
      </div>
      <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.8fr)] items-stretch gap-3">
        <div data-qa="route-panel" className="flex min-h-[580px] flex-col rounded-xl border border-border bg-bg-elevated p-4">
          <h4 className="font-display text-xl font-bold text-black">כרטיס סיפור הדרך</h4>
          {selectedPoint !== null ? <div className="mt-4 space-y-5 text-base leading-relaxed text-black">
            <p className="rounded-xl bg-bg-accent p-3 font-bold">נקודה {selectedPoint+1}{(selectedPoint===0 || state.legs[selectedPoint-1].done) && ` · ${POINTS[selectedPoint].name}`}</p>
            <p>{selectedPoint>0&&!state.legs[selectedPoint-1].done?'זהו במפה את סימן השטח שבנקודה והשלימו אותו בכרטיס הקטע הנכנס.':POINTS[selectedPoint].identify}</p>
            <div><h5 className="font-bold">הקטע הנכנס</h5>{selectedPoint===0?<p>כאן מתחיל הציר. אין קטע נכנס.</p>:<button className={cn('mt-1 underline underline-offset-4',FOCUS)} onClick={()=>chooseLeg(selectedPoint-1)}>קטע {LEGS[selectedPoint-1].letter} · מנקודה {selectedPoint} לנקודה {selectedPoint+1}</button>}</div>
            <div><h5 className="font-bold">הקטע היוצא</h5>{selectedPoint===4?<p>כאן מסתיים הציר. אין קטע יוצא.</p>:<button className={cn('mt-1 underline underline-offset-4',FOCUS)} onClick={()=>chooseLeg(selectedPoint)}>קטע {LEGS[selectedPoint].letter} · מנקודה {selectedPoint+1} לנקודה {selectedPoint+2}</button>}</div>
            <p>לפני שממשיכים, מאמתים שהסימן בשטח תואם למפה.</p>
          </div> : <>
            <p className="mt-3 rounded-xl bg-accent/15 px-3 py-2 text-center font-display text-base font-bold text-black">קטע {leg.letter} · מנקודה {leg.from+1} לנקודה {leg.to+1}</p>
            <div className="mt-4 space-y-4">
              <div><label htmlFor={`${uid}-az`} className="mb-1.5 block font-display text-base font-bold text-black">אזימוט</label><div className="flex gap-2"><button aria-label="מדידת אזימוט במפה" className={fieldButton('azimuth')} onClick={()=>chooseTool('azimuth')}><Compass className="size-5"/></button><input id={`${uid}-az`} data-field="az" className={input} type="number" dir="ltr" inputMode="decimal" min={0} max={360} step={1} placeholder="— °" value={displayAz??''} disabled={!editable} onChange={e=>setNumber('az',e.target.value)}/></div>{showFeedback('az')}</div>
              <div><label htmlFor={`${uid}-m`} className="mb-1.5 block font-display text-base font-bold text-black">מרחק במטרים</label><div className="flex gap-2"><button aria-label="מדידת מרחק במפה" className={fieldButton('distance')} onClick={()=>chooseTool('distance')}><Ruler className="size-5"/></button><input id={`${uid}-m`} data-field="m" className={input} type="number" dir="ltr" inputMode="numeric" min={0} max={5000} step={1} placeholder="—" value={displayM??''} disabled={!editable} onChange={e=>setNumber('m',e.target.value)}/></div>{showFeedback('m')}</div>
              <div><label htmlFor={`${uid}-end`} className="mb-1.5 block font-display text-base font-bold text-black">סימן בסוף הקטע</label><div className="flex gap-2"><button aria-label="בחירת סימן במפה" className={fieldButton('landmarks')} onClick={()=>chooseTool('landmarks')}><MapPin className="size-5"/></button><select id={`${uid}-end`} data-field="end" className={cn(input,'text-base')} value={answer.end??''} disabled={!editable} onChange={e=>dispatch({type:'answer',field:'end',value:(e.target.value||null) as EndOption|null})}><option value="">בחרו סימן במפה</option>{END_OPTIONS.map(v=><option key={v} value={v}>{END_LABEL[v]}</option>)}</select></div>{showFeedback('end')}</div>
            </div>
            <div className="mt-5 border-t border-border pt-3"><h5 className="font-display text-base font-bold text-black">הסיפור שלכם</h5><p className="mt-2 rounded-xl bg-bg-accent p-3 text-base leading-relaxed text-black">מנקודה {leg.from+1} מתקדמים באזימוט <bdi>{displayAz===null?'___':deg(displayAz)}</bdi> לאורך {displayM===null?'___':metres(displayM)}, עד {displayEnd??'___'}.</p>{done&&<p className="mt-2 text-base leading-relaxed text-black">{leg.along}</p>}</div>
            <div className="mt-auto pt-4"><p ref={statusRef} tabIndex={-1} role="status" className="mb-2 text-base leading-snug text-black focus:outline-none">{done&&<Check className="me-1 inline size-5 text-brand-dark"/>}{status}</p>{allDone?<Button className="w-full" variant="secondary" onClick={()=>dispatch({type:'reset'})}>תרגול מחדש</Button>:done?<Button className="w-full" onClick={()=>selectedLeg<3?dispatch({type:'next'}):chooseLeg(state.legs.findIndex(l=>!l.done))}>לקטע הבא<ArrowLeft className="size-4"/></Button>:<Button className="w-full" disabled={!complete(answer)} onClick={()=>dispatch({type:'check'})}>בדיקת הקטע</Button>}</div>
          </>}
        </div>
        {/* The map's tools only help the learner measure; the numbers in the card are always typed by the learner. */}
        <WorkbenchMap selectedLeg={selectedLeg} selectedPoint={selectedPoint} tool={tool} done={done} resetSignal={state.resets} onTool={chooseTool} onSelectLeg={chooseLeg} onSelectPoint={index=>dispatch({type:'point',index})} onSelectLandmark={value=>dispatch({type:'answer',field:'end',value})}/>
      </div>
      <div className="mt-3 rounded-xl border border-border p-3">
        <h4 className="mb-2 font-display text-lg font-bold text-black">סיפור הדרך שנבנה</h4>
        <table className="w-full border-collapse text-start text-base text-black" aria-label="סיפור הדרך: ארבעה קטעים">
          <thead className="bg-bg-accent"><tr>{['קטע','מנקודה לנקודה','אזימוט','מרחק','נקודת אימות'].map(h=><th key={h} className="border-b border-border px-3 py-1.5 text-start font-bold">{h}</th>)}</tr></thead>
          <tbody>{LEGS.map((l,i)=><tr key={i} data-leg-row={i} className={cn('border-b border-border/60',selectedLeg===i&&selectedPoint===null&&'bg-accent/10')}><th scope="row" className="px-3 py-1.5 text-start"><button className={cn('rounded px-2 py-0.5 font-bold',FOCUS)} onClick={()=>chooseLeg(i)} aria-label={`בחירת קטע ${l.letter}`} aria-current={selectedLeg===i&&selectedPoint===null?'step':undefined}>{l.letter}{state.legs[i].done&&<Check className="ms-1 inline size-4 text-brand-dark" aria-label="הושלם"/>}</button></th><td className="px-3">{l.from+1} עד {l.to+1}</td><td className="px-3"><bdi>{state.legs[i].answer.az===null?'—':deg(state.legs[i].answer.az!)}</bdi></td><td className="px-3">{state.legs[i].answer.m===null?'—':metres(state.legs[i].answer.m!)}</td><td className="px-3">{state.legs[i].answer.end?END_LABEL[state.legs[i].answer.end!]:'—'}</td></tr>)}</tbody>
        </table>
        <div className="mx-auto mt-4 flex max-w-4xl items-center justify-center" aria-label="חמש נקודות וארבעה קטעי דרך">
          {POINTS.map((p,i)=><div key={p.n} className={cn('flex items-center',i<4&&'flex-1')}><button onClick={()=>dispatch({type:'point',index:i})} aria-label={`נקודה ${p.n}`} className={cn('grid size-10 shrink-0 place-items-center rounded-full border-2 bg-bg-elevated font-display text-lg font-bold',FOCUS,selectedPoint===i?'border-accent text-accent':'border-brand-dark text-fg')}>{p.n}</button>{i<4&&<button onClick={()=>chooseLeg(i)} aria-label={`קטע ${LEGS[i].letter}`} className={cn('relative mx-2 flex h-10 flex-1 items-center justify-center border-b-2 font-display text-base',FOCUS,selectedLeg===i?'border-accent text-accent':'border-brand-dark text-fg')}>קטע {LEGS[i].letter}</button>}</div>)}
        </div>
      </div>
      <p className="mt-2 text-base text-fg-muted">דוגמה לימודית · הנתונים להמחשה בלבד. מדידות במפה מתקבלות בקירוב: עד 3° בכיוון ועד 35 מ׳ במרחק.</p>
    </section>
  );
}
