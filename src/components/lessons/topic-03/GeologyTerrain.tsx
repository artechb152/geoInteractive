import { useId } from 'react';

/** Schematic cutaway, not a model of a particular mountain. Never mirror for RTL. */
export function GeologyTerrain({ mode }: { mode: 'structure' | 'endo' | 'exo' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 600 420" role="img" aria-label={mode === 'structure' ? 'חתך סכמטי של הר: פני השטח מעל שכבות הסלע' : mode === 'endo' ? 'כוחות פנימיים: חצים עולים מתחת להר וממחישים התרוממות' : 'כוחות חיצוניים: גשם וזרימה לאורך המדרונות ממחישים שחיקה'} className="w-full h-auto" style={{ direction: 'ltr' }}>
      <defs>
        <linearGradient id={`${id}-earth`} x2="0.3" y2="1"><stop className="text-bg" stopColor="currentColor" /><stop offset="1" className="text-border-strong" stopColor="currentColor" /></linearGradient>
        <linearGradient id={`${id}-ridge`} x2="0.8" y2="1"><stop className="text-brand" stopColor="currentColor" /><stop offset="1" className="text-fg" stopColor="currentColor" /></linearGradient>
        <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="m0 0 10 5-10 5Z" className="fill-accent" /></marker>
      </defs>
      <g fill="none" className="text-brand-dark" stroke="currentColor" opacity=".16">
        <ellipse cx="300" cy="274" rx="275" ry="114" /><ellipse cx="300" cy="274" rx="250" ry="96" />
        <path d="M25 274h550M300 25v380M65 70h22m-11-11v22M520 70h22m-11-11v22" />
      </g>
      <path d="m70 252 240 71 230-71v72l-230 68-240-71Z" fill={`url(#${id}-earth)`} />
      <g fill="none" className="text-fg" stroke="currentColor" strokeWidth="2" opacity=".3">
        {[0, 16, 32, 48].map(y => <path key={y} d={`M70 ${266 + y} 180 ${294 + y} 310 ${336 + y} 430 ${306 + y} 540 ${266 + y}`} />)}
        <path d="m178 282-12 24 25 28-9 19m248-74-12 32 19 20-8 24" />
      </g>
      <path d="m70 252 108-49L283 82l83 100 71-22 103 92-230 71Z" fill={`url(#${id}-ridge)`} />
      <path d="m283 82 27 241-83-104Z" className="fill-brand/70" />
      <path d="m283 82 83 100 71-22-54 89-73 74Z" className="fill-fg/60" />
      <g fill="none" className="stroke-bg/35" strokeWidth="1.5">
        <path d="m109 251 85-38 89-99 75 91 78-26 68 65" />
        <path d="m150 264 70-45 65-71 62 76 87-25 45 38M195 279l40-35 52-61 53 62 81-22M244 296l44-79 45 48 52-24" />
      </g>
      <path d="m70 252 240 71 230-71M310 323v69" fill="none" className="stroke-bg/60" strokeWidth="2" />
      {mode === 'structure' && <g fill="none" className="stroke-brand-dark" strokeWidth="1.5"><circle cx="283" cy="82" r="10" /><circle cx="283" cy="82" r="20" opacity=".4" /><path d="M283 62V40h120M478 304h85v-75" /><circle cx="478" cy="304" r="4" className="fill-brand-dark" /></g>}
      {mode === 'endo' && <g className="text-accent" stroke="currentColor" fill="none" strokeWidth="5" markerEnd={`url(#${id}-arrow)`}><path d="M235 366v-74" /><path d="M310 378v-95" /><path d="M385 355v-73" /></g>}
      {mode === 'exo' && <g className="text-accent" stroke="currentColor" fill="none" strokeWidth="4">
        <path d="m299 113 53 81 42 13" markerEnd={`url(#${id}-arrow)`} /><path d="m268 135-50 67-48 32" markerEnd={`url(#${id}-arrow)`} />
        {[170, 205, 240, 370, 405, 440].map(x => <path key={x} d={`m${x} 53-8 18m16 0-8 18`} strokeWidth="2" />)}
      </g>}
    </svg>
  );
}
