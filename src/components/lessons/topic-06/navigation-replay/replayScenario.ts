/**
 * „במהלך הניווט: מה צריך לבדוק?” — the words of the decision exercise: what
 * each stop expects and shows, what the learner is asked, how much help a
 * check gets there, and the feedback for every step of a check. The geometry
 * is in replayRoute (truth) and replayRun (what the navigator knows).
 *
 * Help fades: the opening check is fully guided (the sign is pointed out in the
 * view and on the map), the next two stops offer a hint on request, the stops
 * after the woodland offer none.
 */
import type { CheckVerdict } from './replayCheck';
import { directionWord, signName } from './replayCheck';
import { PLAN_POINTS, SIGNS, type SignId, type StopId } from './replayRoute';
import type { CheckMsg, Debrief, Knowledge, TargetId, Visit } from './replayRun';
import { toTargetM } from './replayRun';
import { distW } from './replayWorld';

export const round10 = (m: number) => Math.round(m / 10) * 10;

export const TARGET_NAME: Record<TargetId, string> = { saddle: 'האוכף', crossing: 'חציית דרך העפר', pines: 'חורשת האורנים' };
export const STOP_LABEL: Record<StopId, string> = {
  stream: 'חציית הנחל',
  enroute: 'בדרך לאוכף',
  saddle: 'האוכף',
  woods: 'אחרי החורש',
  road: 'דרך עפר',
  beyond: 'מעבר לדרך',
  crossing: 'חציית דרך העפר',
};
/** Where a walk is heading, for the walking status. */
export const WALK_TO: Record<StopId, string> = {
  stream: 'בדרך אל חציית הנחל',
  enroute: 'בדרך לאוכף',
  saddle: 'בדרך אל האוכף',
  woods: 'בדרך דרך החורש',
  road: 'יורדים לעבר דרך העפר',
  beyond: 'ממשיכים מעבר לדרך העפר',
  crossing: 'בדרך אל חציית דרך העפר',
};
/** The name a fix made at a stop carries on the map. */
export const FIX_NAME: Record<StopId, string> = {
  stream: 'חציית הנחל',
  enroute: 'בדרך לאוכף',
  saddle: 'האוכף',
  woods: 'יציאה מהחורש',
  road: 'על דרך העפר',
  beyond: 'מעבר לדרך',
  crossing: 'חציית דרך העפר',
};

export type Help = 'guided' | 'hint' | 'none';

export type StopText = {
  help: Help;
  /** the signs a hint points to, best first */
  hint: SignId[];
  /** the opening look (heading and tilt, degrees) */
  view: { yawDeg: number; pitchDeg: number };
  /** what the view shows, for screen readers — what is seen, not what it means */
  viewText: string;
  /** a scenario event that happened on the way here, if any */
  event?: string;
  /** what the plan says should be met here */
  expect: (k: Knowledge) => string;
  question: string;
  /** shown when continuing is not available until a check gives a fix */
  mustCheck?: string;
};

export const STOPS: Record<StopId, StopText> = {
  stream: {
    help: 'guided',
    hint: ['saddle', 'stream'],
    view: { yawDeg: 352, pitchDeg: 7 },
    viewText: 'מבט מחציית הנחל. ערוץ הנחל היבש חוצה את המסלול לרגליכם, ולפנים המדרון עולה אל שתי פסגות ושקע ביניהן.',
    expect: () => 'מכאן כ־400 מ׳ אל האוכף, השקע שבין שתי הפסגות.',
    question: 'דוגמה מודרכת: מאמתים את המיקום לפני היציאה.',
    mustCheck: 'יוצאים רק אחרי שהמיקום אומת.',
  },
  enroute: {
    help: 'hint',
    hint: ['saddle', 'summitE', 'summitW'],
    view: { yawDeg: 356, pitchDeg: 7 },
    viewText: 'מבט קדימה בעלייה מתונה. לפנים שתי פסגות מעוגלות, אחת מימין ואחת משמאל, ושקע ביניהן. שיחים ואבנים פזורים במדרון.',
    expect: (k) => `השקע שבין שתי הפסגות לפניכם, בכיוון ההליכה. נשארו כ־${round10(toTargetM(k))} מ׳ עד האוכף.`,
    question: 'ממשיכים, או עוצרים לבדיקה?',
  },
  saddle: {
    help: 'hint',
    hint: ['saddle', 'summitW', 'summitE'],
    view: { yawDeg: 330, pitchDeg: 1 },
    viewText: 'שני מדרונות עולים משני צדי השקע שבו אתם עומדים. לפנים הקרקע יורדת אל עמק עם חורש, ודרך עפר רחוקה.',
    expect: () => 'לפי הספירה הגעתם לאוכף, נקודת בדיקה מתוכננת. ממנו כ־450 מ׳ אל חציית דרך העפר, בנתיב שעובר בחורש.',
    question: 'ממשיכים לקטע הבא, או עוצרים לבדיקה?',
  },
  woods: {
    help: 'none',
    hint: ['pines'],
    view: { yawDeg: 335, pitchDeg: -2 },
    viewText: 'יציאה מהחורש. מאחור עצי אלון; לפנים מדרון פתוח שיורד לעמק, ורחוק משמאל חורשת אורנים על גבעה.',
    event: 'בחורש עקפתם עצים וסבך, והקו הישר אבד. יצאתם ממנו, אבל לא ברור באיזו נקודה.',
    expect: (k) => `לפי התכנון: עוד כ־${round10(toTargetM(k))} מ׳ עד חציית דרך העפר.`,
    question: 'ממשיכים, או עוצרים לבדיקה?',
  },
  road: {
    help: 'none',
    hint: ['summitW', 'road', 'pines'],
    view: { yawDeg: 290, pitchDeg: -7 },
    viewText: 'דרך עפר לרגליכם, ממשיכה מערבה. לפנים, מעט מימין, חורשת אורנים על גבעה; מאחור גבעה גבוהה.',
    event: 'הגעתם לדרך עפר.',
    expect: (k) => `לפי התכנון: עוד כ־${round10(toTargetM(k))} מ׳ עד חציית הדרך, ושם חורשת האורנים ישר לפנים, בכיוון הקטע הבא.`,
    question: 'זו החצייה? ממשיכים, או עוצרים לבדיקה?',
  },
  beyond: {
    help: 'none',
    hint: ['summitW', 'pines'],
    view: { yawDeg: 315, pitchDeg: 0 },
    viewText: 'שטח פתוח מעבר לדרך העפר. חורשת האורנים משמאל, לא לפנים.',
    event: 'המשכתם כ־90 מ׳ מעבר לדרך, בכיוון הקטע הבא. חורשת האורנים משמאל — לא לפנים, בניגוד לתכנון.',
    expect: () => 'לפי התכנון: חורשת האורנים לפניכם.',
    question: 'המיקום לא ברור, וכל צעד נוסף מגדיל את הטעות.',
    mustCheck: 'עוצרים ובודקים איפה אתם, ורק אז ממשיכים.',
  },
  crossing: {
    help: 'none',
    hint: ['road', 'pines'],
    view: { yawDeg: 300, pitchDeg: -6 },
    viewText: 'דרך עפר לרגליכם. לפנים, בכיוון הקטע הבא, חורשת אורנים על גבעה סלעית.',
    event: 'הגעתם לדרך עפר.',
    expect: () => 'לפי התכנון: זו החצייה, וחורשת האורנים ישר לפנים.',
    question: 'ממשיכים, או עוצרים לבדיקה?',
  },
};

// ───────────────────────────────────────────── check feedback

const the = (id: SignId) => SIGNS[id].the;

export function msgText(m: CheckMsg): { tone: 'ok' | 'info' | 'warn'; text: string } {
  switch (m.kind) {
    case 'view-none':
      return { tone: 'warn', text: 'כאן לא זוהה סימן מהמפה. לחצו על סימן בולט: פסגה, אוכף, ערוץ, דרך או חורשת האורנים.' };
    case 'view-area':
      return { tone: 'info', text: `${the(m.sign)} מסומן במפה, אבל הוא גדול מכדי לסמן נקודה. בחרו סימן חד יותר.` };
    case 'view-far-line':
      return { tone: 'info', text: `סימן קווי, כמו ${the(m.sign)}, קובע מיקום רק כשעומדים עליו. בחרו סימן אחר.` };
    case 'view-hidden':
      return { tone: 'info', text: `את ${the(m.sign)} לא רואים מכאן. בחרו סימן שרואים מהמקום שבו אתם עומדים.` };
    case 'view-dup':
      return { tone: 'info', text: `${the(m.sign)} כבר בבדיקה. בחרו סימן אחר, או הוסיפו את המרחק.` };
    case 'view-ok':
      return { tone: 'ok', text: `בשטח: ${the(m.sign)}. עכשיו מצאו את הסימן הזה במפה.` };
    case 'map-first':
      return { tone: 'info', text: 'קודם בחרו סימן בתצפית, ואז מצאו אותו במפה.' };
    case 'map-none':
      return { tone: 'warn', text: 'כאן במפה אין סימן. לחצו על הסימן עצמו.' };
    case 'map-wrong':
      return { tone: 'warn', text: `במפה לחצתם על ${the(m.picked)}, ובשטח בחרתם ${the(m.want)}. חפשו במפה את ${the(m.want)}.` };
    case 'map-ok':
      return {
        tone: 'ok',
        text:
          m.locus === 'sight'
            ? `התאמה: ${the(m.sign)}. במפה נוסף קו הכיוון מהסימן אליכם — אתם איפשהו על הקו.`
            : m.locus === 'stand'
              ? `התאמה: אתם עומדים ב${the(m.sign).slice(1)}.`
              : `התאמה: אתם איפשהו על ${the(m.sign)}.`,
      };
    case 'distance-ok':
      return { tone: 'ok', text: 'במפה נוספה קשת המרחק: כל המקומות במרחק שנספר מהנקודה המזוהה.' };
  }
}

const LOCUS_WORD = { sight: 'קו הכיוון', arc: 'קשת המרחק', on: 'הדרך', stand: 'האוכף' } as const;

export function verdictText(v: CheckVerdict, fixName: string, k: Knowledge): { tone: 'ok' | 'warn' | 'info'; lead: string; body: string } {
  if (v.kind === 'partial') {
    const body = {
      'one-sight': 'קו אחד מראה כיוון, לא נקודה. הוסיפו את המרחק שנספר, או סימן נוסף מכיוון אחר.',
      'one-arc': 'המרחק לבדו הוא קשת של מקומות אפשריים. הוסיפו סימן מהשטח.',
      'one-on': 'ידוע שאתם על הקו הזה, אבל לא איפה לאורכו. הוסיפו את המרחק או סימן נוסף.',
      'one-stand': 'אוכפים יש גם במקומות אחרים. המרחק מהנקודה המזוהה יאשר שזה האוכף שבתכנון.',
      shallow: 'הקווים נפגשים בזווית חדה מדי ולא מסמנים נקודה. הוסיפו סימן מכיוון אחר.',
      apart: 'הראיות לא נפגשות בשום מקום. בדקו שהסימן במפה הוא אותו סימן שבשטח.',
    }[v.why];
    return { tone: 'info', lead: 'בדיקה חלקית — המיקום עדיין אומדן.', body };
  }
  const via = [...new Set(v.loci.map((l) => (l.kind === 'sight' ? `הקו מ${the(l.sign)}` : l.kind === 'on' ? the(l.sign) : LOCUS_WORD[l.kind])))].join(' ו');
  if (v.agrees)
    return {
      tone: 'ok',
      lead: 'המיקום אומת.',
      body: `${via} נפגשים במקום שמתאים לאומדן (הפרש של כ־${Math.max(5, round10(v.offsetM))} מ׳). הנקודה המזוהה עכשיו: „${fixName}”.`,
    };
  return {
    tone: 'warn',
    lead: `סטייה של כ־${round10(v.offsetM)} מ׳ מהאומדן.`,
    body: `${via} נפגשים ${directionWord(k.estimate, v.at)} מהאומדן. זה המיקום שלכם. הנקודה המזוהה החדשה: „${fixName}”, והקטע הבא יוצא ממנה.`,
  };
}

/** What changed on the map when the learner arrived without a check on the way. */
export function arrivalText(prev: Knowledge, now: Knowledge): string {
  const moved = round10(now.counted - prev.counted);
  return `האומדן התקדם כ־${moved} מ׳ על המסלול המתוכנן. הנקודה המזוהה עדיין „${FIX_NAME[now.fix.stop]}”, ותחום אי־הוודאות גדל ל־±${round10(now.uncertainty)} מ׳.`;
}

// ───────────────────────────────────────────── the debrief

export type DebriefLine = { stop: StopId; chose: string; evidence: string; result: string; tone: 'ok' | 'warn' | 'info' };

export function visitLine(v: Visit, next: Visit | undefined): DebriefLine {
  const last = v.checks[v.checks.length - 1];
  const signs = last ? last.signs.map(signName).concat(last.distance ? ['המרחק שנספר'] : []) : [];
  const evidence = last ? (signs.length ? signs.join(' + ') : 'ללא סימנים') : 'השוואה בין סיפור הדרך לשטח, בלי בדיקה';
  let chose = v.decision === 'check' ? 'עצרתם לבדיקה' : 'המשכתם';
  if (v.stop === 'stream') chose = 'בדיקה מודרכת';
  if (v.fix) {
    const result = v.agrees ? `המיקום אומת — „${FIX_NAME[v.stop]}” נקודה מזוהה.` : `נמצאה סטייה של כ־${round10(v.offsetM ?? 0)} מ׳; המסלול תוקן מהמיקום שנקבע.`;
    return { stop: v.stop, chose, evidence, result, tone: v.agrees ? 'ok' : 'warn' };
  }
  const partial = v.checks.length ? 'הבדיקה נשארה חלקית, ו' : '';
  const result = !next
    ? `${partial}הקטע האחרון יצא מנקודה שלא אומתה.`
    : v.stop === 'woods'
      ? `${partial}הסטייה מהחורש נמשכה: הגעתם לדרך כ־${distanceBetween(next.truth, PLAN_POINTS.crossing)} מ׳ מזרחה לחצייה.`
      : v.stop === 'road'
        ? `${partial}חציתם את דרך העפר מנקודה לא ידועה והמשכתם עוד כ־${distanceBetween(v.truth, next.truth)} מ׳ בלי לדעת היכן אתם.`
        : v.stop === 'saddle'
          ? `${partial}האוכף לא אומת, והאומדן המשיך להימדד מהנקודה המזוהה הקודמת („${FIX_NAME[v.arrival.fix.stop]}”).`
          : next.fix && next.agrees
            ? `${partial}ההמשך נשען על התאמה בין הצפוי לנראה; המיקום אומת בתחנה הבאה.`
            : `${partial}המיקום נשאר אומדן, ואי־הוודאות המשיכה לגדול.`;
  return { stop: v.stop, chose, evidence, result, tone: v.checks.length ? 'info' : v.stop === 'enroute' ? 'ok' : 'info' };
}

export function debriefHeadline(d: Debrief): string {
  const extra = round10(d.walkedM - d.plannedM);
  if (d.driftFoundAt === 'woods') return `גיליתם את הסטייה מיד אחרי החורש, כשהייתה כ־${round10(d.driftOffsetM ?? 0)} מ׳, ותיקנתם אל החצייה. הלכתם בפועל כ־${round10(d.walkedM)} מ׳ (${extra > 0 ? `${extra} מ׳ יותר מהמתוכנן` : 'כמו המתוכנן'}).`;
  if (d.driftFoundAt === 'road') return `הסטייה התגלתה רק בדרך העפר, כ־${round10(d.driftOffsetM ?? 0)} מ׳ מהאומדן, ותוקנה בהליכה לאורך דרך העפר אל החצייה. הלכתם בפועל כ־${round10(d.walkedM)} מ׳ — כ־${extra} מ׳ יותר מהמתוכנן.`;
  if (d.driftFoundAt === 'beyond') return `הסטייה התגלתה רק אחרי שחציתם את דרך העפר, כ־${round10(d.driftOffsetM ?? 0)} מ׳ מהאומדן. הלכתם בפועל כ־${round10(d.walkedM)} מ׳ — כ־${extra} מ׳ יותר מהמתוכנן.`;
  return `הלכתם בפועל כ־${round10(d.walkedM)} מ׳.`;
}

export const distanceBetween = (a: { x: number; z: number }, b: { x: number; z: number }) => round10(distW(a, b));
