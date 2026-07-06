'use client';

/**
 * onboarding-edit-mode — TEMPORARY Wix-style visual editor scoped to
 * topic-01's #scene-onboarding, requested for one-off manual tuning of
 * position/size/font/color per block, then export → hand back to
 * Claude → bake into permanent Tailwind/CSS → delete this file.
 *
 * Activate with `?edit=1` on the lesson URL, e.g.:
 *   /lessons/topic-01?edit=1#scene-onboarding
 *
 * Two wrapping strategies on purpose:
 *  - `EditableBlock` renders its own div carrying `className` — a
 *    drop-in replacement for a plain wrapper div, safe for ordinary
 *    content (accordion panel, cards, text).
 *  - `EditableFrame` clones the existing single child element instead
 *    of adding a new wrapper, and only appends absolutely-positioned
 *    overlay/handle elements as extra children. This exists solely for
 *    the 3D terrain frame: an extra `h-full`-chained wrapper div around
 *    the WebGL canvas previously caused its ResizeObserver to race and
 *    freeze the in-scene labels at the wrong scale after a viewport
 *    resize (see git history on OnboardingScene.tsx). Do not wrap that
 *    element in a new div — use EditableFrame instead.
 */

import {
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

type Override = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontWeight?: 'bold';
  color?: string;
  backgroundColor?: string;
};

type OverridesMap = Record<string, Override>;

const STORAGE_KEY = 'topic01-onboarding-edit-overrides-v1';

type EditModeCtx = {
  enabled: boolean;
  overrides: OverridesMap;
  selectedId: string | null;
  selectedLabel: string | null;
  select: (id: string, label: string) => void;
  updateOverride: (id: string, patch: Partial<Override>) => void;
  resetOverride: (id: string) => void;
  resetAll: () => void;
};

const Ctx = createContext<EditModeCtx | null>(null);

function useEditMode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEditMode must be used within OnboardingEditProvider');
  return ctx;
}

export function OnboardingEditProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [overrides, setOverrides] = useState<OverridesMap>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(new URLSearchParams(window.location.search).get('edit') === '1');
  }, []);

  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setOverrides(JSON.parse(raw));
    } catch {
      // ignore corrupt/blocked storage — edit mode just starts blank
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } catch {
      // ignore — nothing user-facing depends on persistence succeeding
    }
  }, [overrides, enabled]);

  // Click/tap anywhere that isn't a block or the toolbar → deselect.
  useEffect(() => {
    if (!enabled) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-edit-toolbar]')) return;
      setSelectedId(null);
      setSelectedLabel(null);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [enabled]);

  const updateOverride = (id: string, patch: Partial<Override>) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };
  const resetOverride = (id: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };
  const resetAll = () => setOverrides({});
  const select = (id: string, label: string) => {
    setSelectedId(id);
    setSelectedLabel(label);
  };

  return (
    <Ctx.Provider
      value={{ enabled, overrides, selectedId, selectedLabel, select, updateOverride, resetOverride, resetAll }}
    >
      {children}
      {enabled && <EditModeToolbar />}
    </Ctx.Provider>
  );
}

function overrideToStyle(o: Override): CSSProperties {
  return {
    transform: o.x || o.y ? `translate(${o.x ?? 0}px, ${o.y ?? 0}px)` : undefined,
    width: o.width ? `${o.width}px` : undefined,
    height: o.height ? `${o.height}px` : undefined,
    fontSize: o.fontSize ? `${o.fontSize}px` : undefined,
    fontWeight: o.fontWeight,
    color: o.color || undefined,
    backgroundColor: o.backgroundColor || undefined,
  };
}

function startDrag(
  e: React.PointerEvent,
  id: string,
  label: string,
  o: Override,
  elRef: React.RefObject<HTMLElement | null>,
  updateOverride: EditModeCtx['updateOverride'],
  select: EditModeCtx['select'],
) {
  e.stopPropagation();
  select(id, label);
  const startX = e.clientX;
  const startY = e.clientY;
  const baseX = o.x ?? 0;
  const baseY = o.y ?? 0;
  let pending: { x: number; y: number } | null = null;
  const onMove = (ev: PointerEvent) => {
    pending = { x: baseX + (ev.clientX - startX), y: baseY + (ev.clientY - startY) };
    if (elRef.current) elRef.current.style.transform = `translate(${pending.x}px, ${pending.y}px)`;
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (pending) updateOverride(id, pending);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function startResize(
  e: React.PointerEvent,
  id: string,
  o: Override,
  elRef: React.RefObject<HTMLElement | null>,
  updateOverride: EditModeCtx['updateOverride'],
) {
  e.stopPropagation();
  e.preventDefault();
  const rect = elRef.current?.getBoundingClientRect();
  const startX = e.clientX;
  const startY = e.clientY;
  const baseW = o.width ?? rect?.width ?? 200;
  const baseH = o.height ?? rect?.height ?? 100;
  let pending: { width: number; height: number } | null = null;
  const onMove = (ev: PointerEvent) => {
    const width = Math.max(80, baseW + (ev.clientX - startX));
    const height = Math.max(40, baseH + (ev.clientY - startY));
    pending = { width, height };
    if (elRef.current) {
      elRef.current.style.width = `${width}px`;
      elRef.current.style.height = `${height}px`;
    }
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (pending) updateOverride(id, pending);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function Decorations({
  id,
  label,
  isSelected,
  o,
  elRef,
}: {
  id: string;
  label: string;
  isSelected: boolean;
  o: Override;
  elRef: React.RefObject<HTMLElement | null>;
}) {
  const { updateOverride, select } = useEditMode();
  return (
    <>
      <div
        onPointerDown={(e) => startDrag(e, id, label, o, elRef, updateOverride, select)}
        className={cn(
          'absolute inset-0 z-40 cursor-move',
          isSelected ? 'ring-2 ring-accent ring-inset' : 'hover:ring-2 hover:ring-accent/40 ring-inset',
        )}
      />
      {isSelected && (
        <>
          <span className="absolute -top-6 start-0 text-[10px] font-mono font-bold bg-accent text-white px-2 py-0.5 rounded-t-md pointer-events-none z-[60] whitespace-nowrap">
            {label}
          </span>
          <div
            onPointerDown={(e) => startResize(e, id, o, elRef, updateOverride)}
            className="absolute -bottom-2 -start-2 size-5 rounded-full bg-accent border-2 border-white shadow-lg cursor-nwse-resize z-[60]"
          />
        </>
      )}
    </>
  );
}

/** Drop-in replacement for a plain wrapper div. Safe for any ordinary content. */
export function EditableBlock({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const { enabled, overrides, selectedId } = useEditMode();
  const elRef = useRef<HTMLDivElement | null>(null);
  const o = overrides[id] ?? {};
  const style = overrideToStyle(o);

  if (!enabled) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  const isSelected = selectedId === id;
  return (
    <div ref={elRef} className={cn(className, 'relative')} style={style}>
      {children}
      <Decorations id={id} label={label} isSelected={isSelected} o={o} elRef={elRef} />
    </div>
  );
}

/**
 * No new wrapper — clones the single child element and appends overlay
 * children into it instead. Use ONLY for elements whose own resize
 * timing is delicate (the 3D terrain frame). See file header.
 */
export function EditableFrame({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactElement<{ style?: CSSProperties; className?: string; children?: ReactNode }>;
}) {
  const { enabled, overrides, selectedId } = useEditMode();
  const elRef = useRef<HTMLElement | null>(null);
  const o = overrides[id] ?? {};
  const style = overrideToStyle(o);

  if (!enabled) {
    return cloneElement(children, { style: { ...(children.props.style || {}), ...style } });
  }

  const isSelected = selectedId === id;
  return cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      elRef.current = node;
    },
    style: { ...(children.props.style || {}), ...style },
    children: (
      <>
        {children.props.children}
        <Decorations id={id} label={label} isSelected={isSelected} o={o} elRef={elRef} />
      </>
    ),
  } as never);
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="flex items-center justify-between text-xs gap-2">
      <span className="text-fg-muted">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          min={min}
          max={max}
          value={value ?? ''}
          placeholder="ברירת מחדל"
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          className="w-20 border border-border rounded px-2 py-1 text-xs"
        />
        {value !== undefined && (
          <button type="button" onClick={() => onChange(undefined)} className="text-fg-dim hover:text-fg text-xs px-1">
            ✕
          </button>
        )}
      </span>
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <label className="flex items-center justify-between text-xs gap-2">
      <span className="text-fg-muted">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="color"
          value={value ?? '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="size-7 border border-border rounded cursor-pointer"
        />
        {value !== undefined && (
          <button type="button" onClick={() => onChange(undefined)} className="text-fg-dim hover:text-fg text-xs px-1">
            ✕
          </button>
        )}
      </span>
    </label>
  );
}

function EditModeToolbar() {
  const { overrides, selectedId, selectedLabel, updateOverride, resetOverride, resetAll } = useEditMode();
  const [showExport, setShowExport] = useState(false);
  const o = selectedId ? overrides[selectedId] ?? {} : null;

  return (
    <div
      data-edit-toolbar
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:start-4 sm:w-[320px] z-[100] rounded-2xl border-2 border-accent bg-bg-elevated shadow-elevated p-4 max-h-[80vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-display font-bold text-sm text-accent">🛠 מצב עריכה — פתיחה שיעור 1</span>
        <button
          type="button"
          onClick={() => {
            window.location.href = window.location.pathname + window.location.hash;
          }}
          className="text-xs text-fg-dim hover:text-fg"
        >
          סגור
        </button>
      </div>

      {!selectedId && (
        <p className="text-xs text-fg-muted leading-relaxed mb-3">
          לחץ על כל בלוק במסך כדי לבחור אותו. גרירה מהמרכז מזיזה, גרירה מהעיגול בפינה משנה גודל.
        </p>
      )}

      {selectedId && o && (
        <div className="space-y-2.5 mb-3 pb-3 border-b border-border-subtle">
          <div className="text-xs font-mono font-bold text-fg">{selectedLabel}</div>
          <NumberField label="גודל גופן" value={o.fontSize} onChange={(fontSize) => updateOverride(selectedId, { fontSize })} min={10} max={72} />
          <label className="flex items-center justify-between text-xs">
            <span className="text-fg-muted">מודגש</span>
            <input
              type="checkbox"
              checked={o.fontWeight === 'bold'}
              onChange={(e) => updateOverride(selectedId, { fontWeight: e.target.checked ? 'bold' : undefined })}
            />
          </label>
          <ColorField label="צבע טקסט" value={o.color} onChange={(color) => updateOverride(selectedId, { color })} />
          <ColorField
            label="צבע רקע"
            value={o.backgroundColor}
            onChange={(backgroundColor) => updateOverride(selectedId, { backgroundColor })}
          />
          <button
            type="button"
            onClick={() => resetOverride(selectedId)}
            className="w-full text-xs border border-border rounded px-2 py-1.5 hover:bg-bg-accent"
          >
            אפס בלוק זה
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowExport(true)}
          className="flex-1 text-xs font-semibold bg-accent text-white rounded px-2 py-1.5 hover:bg-accent-hover"
        >
          ייצוא שינויים
        </button>
        <button type="button" onClick={resetAll} className="text-xs border border-border rounded px-2 py-1.5 hover:bg-bg-accent">
          איפוס הכל
        </button>
      </div>

      {showExport && <ExportModal overrides={overrides} onClose={() => setShowExport(false)} />}
    </div>
  );
}

function ExportModal({ overrides, onClose }: { overrides: OverridesMap; onClose: () => void }) {
  const json = JSON.stringify(overrides, null, 2);
  const [copied, setCopied] = useState(false);
  return (
    <div data-edit-toolbar className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg-elevated rounded-2xl p-4 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="font-display font-bold text-sm mb-2">העתק את הטקסט הבא ושלח לי בצ'אט</div>
        {Object.keys(overrides).length === 0 ? (
          <p className="text-xs text-fg-muted">עדיין אין שינויים שמורים.</p>
        ) : (
          <textarea readOnly value={json} onFocus={(e) => e.target.select()} className="w-full h-64 text-xs font-mono border border-border rounded p-2" />
        )}
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(json);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="flex-1 bg-accent text-white rounded px-3 py-2 text-sm font-semibold"
          >
            {copied ? 'הועתק ✓' : 'העתק ללוח'}
          </button>
          <button type="button" onClick={onClose} className="border border-border rounded px-3 py-2 text-sm">
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
