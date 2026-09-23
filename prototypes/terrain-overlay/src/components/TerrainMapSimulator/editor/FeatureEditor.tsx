'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Point, TerrainArea, TerrainFeature } from '../../../data/types';
import { TERRAIN_AREAS, getAreaById } from '../../../data/areas';
import { LayerImage, useMapLayers } from '../MapLayers';
import '../TerrainMapSimulator.css';
import './editor.css';

/**
 * FeatureEditor — מסך עריכת תוכן למדריכים (`?editor=1`).
 *
 * הבעיה שהוא פותר: היום, הוספת צורה או תיקון של אזור לחיצה שגוי מחייבים
 * הרצת סקריפטים ב-Node ועריכת TypeScript ביד. מדריך תוכן — שהוא האדם שיודע
 * *איפה* השלוחה — לא יכול לתחזק את זה, ולכן כל תיקון קטן חוזר אל מפתח.
 *
 * מה שהכלי **אינו** עושה, בכוונה: הוא אינו כותב לדיסק ואינו מריץ את
 * ה-pipeline. הוא מייצר JSON תקין שנדבק ל-`content/terrain.he.json` או
 * ל-override של האזור. שמירה ישירה הייתה דורשת שרת, והיא גם הייתה עוקפת
 * את בקרת הגרסאות — כלומר משנה תוכן לימודי בלי שאיש רואה מה השתנה.
 */

type Tool = 'select' | 'draw' | 'label' | 'arrow';

interface Draft {
  id: string;
  name: string;
  family: TerrainFeature['family'];
  signature: TerrainFeature['signature'];
  definition: string;
  aerialExplanation: string;
  mapExplanation: string;
  whyItMatters: string;
  hitPath: string;
  labelPoint: Point;
  flowArrow?: { x: number; y: number; angle: number };
}

const FAMILY_OPTIONS: TerrainFeature['family'][] = [
  'concept',
  'convex',
  'concave',
  'pass',
  'surface',
];
const SIGNATURE_OPTIONS: TerrainFeature['signature'][] = [
  'rings',
  'crest',
  'bowtie',
  'parallel',
  'u',
  'v',
  'contours',
];

function toDraft(f: TerrainFeature): Draft {
  return {
    id: f.id,
    name: f.name,
    family: f.family,
    signature: f.signature,
    definition: f.definition,
    aerialExplanation: f.aerialExplanation,
    mapExplanation: f.mapExplanation,
    whyItMatters: f.whyItMatters,
    hitPath: f.hitPath,
    labelPoint: { ...f.labelPoint },
    flowArrow: f.flowArrow ? { ...f.flowArrow } : undefined,
  };
}

/* המזהה נשאר באנגלית קטנה: הוא מפתח בקוד ובקישורים עמוקים, ולא טקסט
   שהלומד רואה. ברירת מחדל בעברית הייתה נכשלת מיד באימות של הכלי עצמו. */
const blank = (): Draft => ({
  id: 'feature-1',
  name: 'צורה חדשה',
  family: 'convex',
  signature: 'rings',
  definition: '',
  aerialExplanation: '',
  mapExplanation: '',
  whyItMatters: '',
  hitPath: '',
  labelPoint: { x: 500, y: 500 },
});

export default function FeatureEditor() {
  const [areaId, setAreaId] = useState(TERRAIN_AREAS[0].id);
  const area: TerrainArea = getAreaById(areaId);
  const [drafts, setDrafts] = useState<Draft[]>(() => area.features.map(toDraft));
  const [activeId, setActiveId] = useState<string | null>(drafts[0]?.id ?? null);
  const [tool, setTool] = useState<Tool>('select');
  const [pending, setPending] = useState<Point[]>([]);
  const [showAerial, setShowAerial] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  const layers = useMapLayers(area, ['aerial', 'topo']);

  useEffect(() => {
    setDrafts(area.features.map(toDraft));
    setActiveId(area.features[0]?.id ?? null);
    setPending([]);
  }, [area]);

  const active = drafts.find((d) => d.id === activeId);

  const patch = useCallback(
    (changes: Partial<Draft>) => {
      setDrafts((list) => list.map((d) => (d.id === activeId ? { ...d, ...changes } : d)));
    },
    [activeId],
  );

  /** ממיר לחיצה במסך לקואורדינטת viewBox — אותה המרה שהמפה עצמה עושה. */
  const toLocal = (e: React.MouseEvent): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const l = p.matrixTransform(ctm.inverse());
    return { x: Math.round(l.x), y: Math.round(l.y) };
  };

  const onCanvasClick = (e: React.MouseEvent) => {
    const pt = toLocal(e);
    if (tool === 'draw') {
      setPending((p) => [...p, pt]);
      return;
    }
    if (tool === 'label') {
      patch({ labelPoint: pt });
      setTool('select');
      return;
    }
    if (tool === 'arrow' && active) {
      /* הזווית נמדדת מהתווית אל הנקודה שנלחצה: כיוון המורד הוא מה שהחץ
         אמור להראות, וקביעתו במעלות ביד היא בדיוק סוג הפרט שמדריך תוכן
         לא אמור לחשב. */
      const angle = Math.round(
        (Math.atan2(pt.y - active.labelPoint.y, pt.x - active.labelPoint.x) * 180) / Math.PI,
      );
      patch({ flowArrow: { x: active.labelPoint.x, y: active.labelPoint.y, angle } });
      setTool('select');
    }
  };

  const closePath = () => {
    if (pending.length < 3) return;
    const d =
      `M${pending[0].x},${pending[0].y} ` +
      pending
        .slice(1)
        .map((p) => `L${p.x},${p.y}`)
        .join(' ') +
      ' Z';
    patch({ hitPath: d });
    setPending([]);
    setTool('select');
  };

  const addFeature = () => {
    const d = blank();
    let i = 1;
    while (drafts.some((x) => x.id === d.id)) d.id = `feature-${++i}`;
    setDrafts((list) => [...list, d]);
    setActiveId(d.id);
    setTool('draw');
    setPending([]);
  };

  const removeFeature = (id: string) => {
    setDrafts((list) => list.filter((d) => d.id !== id));
    setActiveId((cur) => (cur === id ? null : cur));
  };

  /* ---------------------------- ייצוא ---------------------------- */

  const exported = useMemo(() => {
    const kinds: Record<string, unknown> = {};
    const geometry: Record<string, unknown> = {};
    for (const d of drafts) {
      kinds[d.id] = {
        name: d.name,
        family: d.family,
        signature: d.signature,
        definition: d.definition,
        aerial: d.aerialExplanation,
        map: d.mapExplanation,
        why: d.whyItMatters,
      };
      geometry[d.id] = {
        hitPath: d.hitPath,
        labelPoint: d.labelPoint,
        ...(d.flowArrow ? { flowArrow: d.flowArrow } : {}),
      };
    }
    return JSON.stringify({ areaId: area.id, kinds, geometry }, null, 2);
  }, [area.id, drafts]);

  const problems = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const d of drafts) {
      if (seen.has(d.id)) out.push(`מזהה כפול: ${d.id}`);
      seen.add(d.id);
      if (!/^[a-z][a-z0-9-]*$/.test(d.id)) out.push(`${d.id}: מזהה חייב להיות באנגלית קטנה`);
      if (!d.hitPath) out.push(`${d.id}: אין אזור לחיצה`);
      if (!d.name.trim()) out.push(`${d.id}: אין שם`);
      if (!d.definition.trim()) out.push(`${d.id}: אין הגדרה`);
      const { x, y } = d.labelPoint;
      if (x < 0 || x > 1000 || y < 0 || y > 1000) out.push(`${d.id}: התווית מחוץ למפה`);
    }
    return out;
  }, [drafts]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exported);
    } catch {
      /* אין הרשאת לוח — הטקסט ממילא מוצג ואפשר לסמן אותו ידנית */
    }
  };

  return (
    <div className="tms tms-editor" dir="rtl" lang="he">
      <header className="tms-editor__bar">
        <strong>עורך תוכן</strong>
        <label>
          אזור:
          <select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            {TERRAIN_AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <div className="tms-editor__tools" role="group" aria-label="כלי עריכה">
          {(
            [
              ['select', 'בחירה'],
              ['draw', 'ציור אזור'],
              ['label', 'מיקום תווית'],
              ['arrow', 'כיוון מורד'],
            ] as [Tool, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={'tms-btn tms-btn--sm' + (tool === id ? ' tms-btn--on' : '')}
              onClick={() => {
                setTool(id);
                if (id !== 'draw') setPending([]);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="tms-btn tms-btn--sm"
          onClick={() => setShowAerial((v) => !v)}
        >
          {showAerial ? 'הצג מפה' : 'הצג תצ״א'}
        </button>
        {tool === 'draw' && (
          <>
            <button
              type="button"
              className="tms-btn tms-btn--sm tms-btn--primary"
              onClick={closePath}
              disabled={pending.length < 3}
            >
              סגירת המתאר ({pending.length})
            </button>
            <button type="button" className="tms-btn tms-btn--sm" onClick={() => setPending([])}>
              ניקוי
            </button>
          </>
        )}
      </header>

      <div className="tms-editor__body">
        <aside className="tms-editor__list">
          <button
            type="button"
            className="tms-btn tms-btn--sm tms-btn--primary"
            onClick={addFeature}
          >
            + צורה חדשה
          </button>
          <ul>
            {drafts.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  className={
                    'tms-editor__item' + (d.id === activeId ? ' tms-editor__item--on' : '')
                  }
                  onClick={() => setActiveId(d.id)}
                >
                  <span>{d.name}</span>
                  <code>{d.id}</code>
                </button>
                <button
                  type="button"
                  className="tms-editor__del"
                  aria-label={`מחיקת ${d.name}`}
                  onClick={() => removeFeature(d.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="tms-editor__canvas">
          <div className="tms-editor__stage">
            <LayerImage area={area} name={showAerial ? 'aerial' : 'topo'} state={layers} priority />
            <svg
              ref={svgRef}
              viewBox="0 0 1000 1000"
              preserveAspectRatio="xMidYMid meet"
              onClick={onCanvasClick}
              className={`tms-editor__svg tms-editor__svg--${tool}`}
            >
              {drafts.map((d) => (
                <path
                  key={d.id}
                  d={d.hitPath}
                  className={
                    'tms-editor__shape' + (d.id === activeId ? ' tms-editor__shape--on' : '')
                  }
                />
              ))}
              {drafts.map((d) => (
                <circle
                  key={`l-${d.id}`}
                  cx={d.labelPoint.x}
                  cy={d.labelPoint.y}
                  r={7}
                  className={
                    'tms-editor__anchor' + (d.id === activeId ? ' tms-editor__anchor--on' : '')
                  }
                />
              ))}
              {active?.flowArrow && (
                <g
                  transform={`translate(${active.flowArrow.x},${active.flowArrow.y}) rotate(${active.flowArrow.angle})`}
                >
                  <path className="tms-editor__arrow" d="M0,0 L60,0 M44,-14 L60,0 L44,14" />
                </g>
              )}
              {pending.length > 0 && (
                <>
                  <polyline
                    className="tms-editor__pending"
                    points={pending.map((p) => `${p.x},${p.y}`).join(' ')}
                  />
                  {pending.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={6} className="tms-editor__vertex" />
                  ))}
                </>
              )}
            </svg>
          </div>
        </div>

        <aside className="tms-editor__form">
          {active ? (
            <>
              <label>
                מזהה
                <input
                  value={active.id}
                  onChange={(e) => {
                    const next = e.target.value;
                    setDrafts((list) =>
                      list.map((d) => (d.id === activeId ? { ...d, id: next } : d)),
                    );
                    setActiveId(next);
                  }}
                />
              </label>
              <label>
                שם
                <input value={active.name} onChange={(e) => patch({ name: e.target.value })} />
              </label>
              <label>
                משפחה
                <select
                  value={active.family}
                  onChange={(e) => patch({ family: e.target.value as Draft['family'] })}
                >
                  {FAMILY_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                חתימת קווי גובה
                <select
                  value={active.signature}
                  onChange={(e) => patch({ signature: e.target.value as Draft['signature'] })}
                >
                  {SIGNATURE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                הגדרה
                <textarea
                  rows={3}
                  value={active.definition}
                  onChange={(e) => patch({ definition: e.target.value })}
                />
              </label>
              <label>
                בתצ״א
                <textarea
                  rows={3}
                  value={active.aerialExplanation}
                  onChange={(e) => patch({ aerialExplanation: e.target.value })}
                />
              </label>
              <label>
                במפה
                <textarea
                  rows={3}
                  value={active.mapExplanation}
                  onChange={(e) => patch({ mapExplanation: e.target.value })}
                />
              </label>
              <label>
                למה זה חשוב
                <textarea
                  rows={3}
                  value={active.whyItMatters}
                  onChange={(e) => patch({ whyItMatters: e.target.value })}
                />
              </label>
              <p className="tms-editor__hint">
                תווית: {active.labelPoint.x}, {active.labelPoint.y}
                {active.flowArrow ? ` · חץ ${active.flowArrow.angle}°` : ''}
              </p>
            </>
          ) : (
            <p className="tms-editor__hint">בחרו צורה מהרשימה, או צרו חדשה.</p>
          )}
        </aside>
      </div>

      <footer className="tms-editor__out">
        <div className="tms-editor__outhead">
          <strong>ייצוא</strong>
          {problems.length > 0 ? (
            <span className="tms-editor__bad">
              {problems.length} בעיות: {problems[0]}
            </span>
          ) : (
            <span className="tms-editor__ok">תקין</span>
          )}
          <button type="button" className="tms-btn tms-btn--sm" onClick={copy}>
            העתקה
          </button>
        </div>
        <textarea readOnly value={exported} rows={8} spellCheck={false} dir="ltr" />
      </footer>
    </div>
  );
}
