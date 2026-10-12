/* The workbench's calculator: a learner's arithmetic — numbers, + − × ÷ and brackets — read
   without eval. Kept apart from the component so the unit tests reach it. */

/** What may be typed into the calculator's line (anything else is dropped as it is typed). */
export const CALC_CHARS = /[^0-9.,+\-−–*/×÷xX:() ]/g;

/** The value of an expression, or null when it is not a whole one (or divides by 0). */
export function evaluate(src: string): number | null {
  const s = src
    .replace(/[×xX*]/g, '*')
    .replace(/[÷:/]/g, '/')
    .replace(/[−–]/g, '-')
    .replace(/,/g, '.')
    .replace(/\s+/g, '');
  if (!s) return null;
  let i = 0;
  const expr = (): number => {
    let v = term();
    while (s[i] === '+' || s[i] === '-') {
      const op = s[i++];
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  const term = (): number => {
    let v = factor();
    while (s[i] === '*' || s[i] === '/') {
      const op = s[i++];
      const r = factor();
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  const factor = (): number => {
    if (s[i] === '-') return i++, -factor();
    if (s[i] === '+') return i++, factor();
    if (s[i] === '(') {
      i++;
      const v = expr();
      if (s[i++] !== ')') throw new Error('bracket');
      return v;
    }
    const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
    if (!m) throw new Error('number');
    i += m[0].length;
    return Number(m[0]);
  };
  try {
    const v = expr();
    return i === s.length && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** A result as the learner would write it: no float noise (0.404 × 60 → 24.24), no -0. */
export function showNumber(v: number): string {
  const r = Number(v.toPrecision(12));
  return Object.is(r, -0) ? '0' : String(r);
}
