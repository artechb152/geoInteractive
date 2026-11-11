import { LEGS, END_LABEL, type Answer, type Field, type EndOption } from './routeStoryModel';
export type Tool = 'select' | 'azimuth' | 'distance' | 'landmarks';
export type LegWork = { answer: Answer; checked: Answer | null; done: boolean };
export type Workbench = { selectedLeg: number; selectedPoint: number | null; tool: Tool; legs: LegWork[]; revision: number; /** Counts resets: the map puts its hand tools back when it changes. */ resets: number };
export type WorkbenchHistory = { present: Workbench; past: Workbench[] };
const freshLegs = (): LegWork[] => LEGS.map(() => ({ answer: { az: null, m: null, end: null }, checked: null, done: false }));
export const INITIAL_WORKBENCH: WorkbenchHistory = { present: { selectedLeg: 0, selectedPoint: null, tool: 'azimuth', legs: freshLegs(), revision: 0, resets: 0 }, past: [] };
export const LEG_ENDS: EndOption[] = ['stream-bend', 'saddle', 'road', 'pines-rocks'];
export type WorkbenchAction =
  | { type: 'leg' | 'point'; index: number }
  | { type: 'tool'; tool: Tool }
  | { type: 'answer'; field: Field; value: number | Answer['end'] }
  | { type: 'check' | 'reset' | 'undo' | 'next' };
export const complete = (a: Answer) => a.az !== null && a.m !== null && a.end !== null;
export const routeComplete = (s: Workbench) => s.legs.every(l => l.done);
/** Within the 3° reading tolerance of a bearing, either side of north. */
const nearAz = (az: number, target: number) => Math.abs(((az - target + 540) % 360) - 180) <= 3;
export function matches(a: Answer, field: Field, index: number) {
  if (field === 'az') return a.az !== null && nearAz(a.az, LEGS[index].az);
  if (field === 'm') return a.m !== null && Math.abs(a.m - LEGS[index].m) <= 35;
  return a.end === LEG_ENDS[index];
}
export function fieldVerdict(s: Workbench, field: Field) {
  const l = s.legs[s.selectedLeg];
  return l.checked && l.checked[field] !== null && l.checked[field] === l.answer[field] ? matches(l.answer, field, s.selectedLeg) ? 'right' : 'wrong' : null;
}
export function workbenchReducer(h: WorkbenchHistory, a: WorkbenchAction): WorkbenchHistory {
  const s = h.present, current = s.legs[s.selectedLeg];
  if (a.type === 'undo') {
    const last = h.past.at(-1);
    return last ? { present: { ...last, revision: s.revision + 1 }, past: h.past.slice(0, -1) } : h;
  }
  if (a.type === 'leg' || a.type === 'point') {
    if (!Number.isInteger(a.index) || a.index < 0 || a.index > (a.type === 'leg' ? 3 : 4)) return h;
    return { ...h, present: { ...s, ...(a.type === 'leg' ? { selectedLeg: a.index, selectedPoint: null, tool: 'azimuth' as Tool } : { selectedPoint: a.index, tool: 'select' as Tool }), revision: s.revision + 1 } };
  }
  if (a.type === 'tool') return { ...h, present: { ...s, tool: a.tool, selectedPoint: null, revision: s.revision + 1 } };
  if (a.type === 'next') {
    if (!current.done || s.selectedLeg === 3) return h;
    return workbenchReducer(h, { type: 'leg', index: s.selectedLeg + 1 });
  }
  let next = s;
  if (a.type === 'reset') next = { ...INITIAL_WORKBENCH.present, legs: freshLegs(), revision: s.revision + 1, resets: s.resets + 1 };
  if (a.type === 'answer') {
    if (current.done) return h;
    if (a.value !== null && (a.field === 'end' ? !(typeof a.value === 'string' && a.value in END_LABEL) : !(typeof a.value === 'number' && Number.isFinite(a.value) && a.value >= 0 && a.value <= (a.field === 'az' ? 360 : 5000)))) return h;
    if (current.answer[a.field] === a.value) return h;
    next = { ...s, legs: s.legs.map((l, i) => i === s.selectedLeg ? { ...l, answer: { ...l.answer, [a.field]: a.value } } : l) };
  }
  if (a.type === 'check') {
    if (!complete(current.answer) || current.done) return h;
    next = { ...s, legs: s.legs.map((l, i) => i === s.selectedLeg ? { ...l, checked: { ...l.answer }, done: (['az', 'm', 'end'] as Field[]).every(f => matches(l.answer, f, i)) } : l) };
  }
  return next === s ? h : { present: next, past: [...h.past.slice(-49), s] };
}
export function feedback(s: Workbench, field: Field): string {
  if (fieldVerdict(s, field) === 'right') return field === 'az' ? 'הכיוון מתאים לקטע שבמפה.' : field === 'm' ? 'המרחק מתאים לאורך הקטע בקנה המידה.' : 'הסימן נמצא בסוף הקטע ומאפשר לאמת הגעה.';
  const from = s.selectedLeg + 1, to = from + 1;
  if (field === 'end') return `הסימן שבחרתם אינו בסוף הקטע. חפשו במפה את הסימן בנקודה ${to}, ולא סימן שעוברים לידו בדרך.`;
  const az = s.legs[s.selectedLeg].answer.az, target = LEGS[s.selectedLeg].az;
  // The two protractor mistakes worth naming: measuring from the far end, and counting anticlockwise.
  if (field === 'az' && az !== null && nearAz(az, (target + 180) % 360)) return `זה הכיוון ההפוך, מנקודה ${to} חזרה אל נקודה ${from}. מקמו את מרכז מד־הזווית בנקודת המוצא של הקטע, נקודה ${from}.`;
  if (field === 'az' && az !== null && nearAz(az, 360 - target)) return 'נראה שהזווית נקראה נגד כיוון השעון. קוראים את השנתות מהצפון (0) עם כיוון השעון.';
  if (field === 'az') return `הכיוון אינו תואם. מקמו את מרכז מד־הזווית בנקודה ${from} ומדדו מהצפון עם כיוון השעון אל נקודה ${to}.`;
  return `המרחק אינו תואם. מדדו בסרגל מנקודה ${from} עד נקודה ${to}, או ספרו משבצות: כל משבצת היא 100 מ׳.`;
}
