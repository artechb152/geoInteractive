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
 * Controls:
 *  - Click a block to select it. Shift/Ctrl+click adds/removes it from
 *    a multi-selection; dragging any member of a multi-selection moves
 *    the whole group together (keeps relative spacing intact).
 *  - Drag the round corner handle to resize both axes; the pill
 *    handles on the end-edge / bottom-edge resize one axis only.
 *  - Resizing height auto-scales the block's font size proportionally
 *    (so stretching doesn't leave obviously empty space) unless a
 *    manual font size has been typed into the panel.
 *  - Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) undo/redo. Also buttons in the
 *    toolbar.
 *  - Width/height/font can all be typed by hand in the side panel
 *    (px or % for size).
 *  - Dragging shows Figma/Instagram-style alignment guide lines and
 *    snaps to another block's edges/centers within a small threshold
 *    (e.g. lining two cards up on the same row).
 *
 * Two wrapping strategies on purpose:
 *  - `EditableBlock` renders its own div carrying `className` — a
 *    drop-in replacement for a plain wrapper div, safe for ordinary
 *    content (accordion panel, cards, text).
 *  - `EditableFrame` clones the existing single child element instead
 *    of adding a new wrapper, appending overlay/handles as extra
 *    children. This exists solely for the 3D terrain frame: an extra
 *    `h-full`-chained wrapper div around the WebGL canvas previously
 *    caused its ResizeObserver to race and freeze the in-scene labels
 *    at the wrong scale after a viewport resize. Do not wrap that
 *    element in a new div — use EditableFrame instead.
 */

import {
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

type Unit = 'px' | '%';

type Override = {
  x?: number;
  y?: number;
  width?: number;
  widthUnit?: Unit;
  height?: number;
  heightUnit?: Unit;
  fontSize?: number;
  fontSizeManual?: boolean;
  fontFamily?: 'sans' | 'display';
  fontWeight?: 'bold';
  color?: string;
  backgroundColor?: string;
};

type OverridesMap = Record<string, Override>;
type Patch = Record<string, Partial<Override> | null>;

const STORAGE_KEY = 'topic01-onboarding-edit-overrides-v2';
const HISTORY_LIMIT = 50;

type HistoryState = { overrides: OverridesMap; past: OverridesMap[]; future: OverridesMap[] };

type HistoryAction =
  | { type: 'commit'; patch: Patch }
  | { type: 'resetAll' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'load'; overrides: OverridesMap };

function applyPatch(overrides: OverridesMap, patch: Patch): OverridesMap {
  const next = { ...overrides };
  for (const [id, value] of Object.entries(patch)) {
    if (value === null) delete next[id];
    else next[id] = { ...next[id], ...value };
  }
  return next;
}

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'commit':
      return {
        overrides: applyPatch(state.overrides, action.patch),
        past: [...state.past, state.overrides].slice(-HISTORY_LIMIT),
        future: [],
      };
    case 'resetAll':
      return { overrides: {}, past: [...state.past, state.overrides].slice(-HISTORY_LIMIT), future: [] };
    case 'undo': {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return { overrides: prev, past: state.past.slice(0, -1), future: [state.overrides, ...state.future].slice(0, HISTORY_LIMIT) };
    }
    case 'redo': {
      if (state.future.length === 0) return state;
      const nextState = state.future[0];
      return { overrides: nextState, past: [...state.past, state.overrides].slice(-HISTORY_LIMIT), future: state.future.slice(1) };
    }
    case 'load':
      return { ...state, overrides: action.overrides };
    default:
      return state;
  }
}

type EditModeCtx = {
  enabled: boolean;
  overrides: OverridesMap;
  selectedIds: string[];
  primaryLabel: string | null;
  selectOnly: (id: string, label: string) => void;
  toggleSelect: (id: string, label: string) => void;
  clearSelection: () => void;
  updateOverride: (id: string, patch: Partial<Override>) => void;
  commitPatch: (patch: Patch) => void;
  resetSelected: () => void;
  resetAll: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  registerEl: (id: string, node: HTMLElement | null) => void;
  getElementRefs: () => Record<string, HTMLElement | null>;
  getBaseMetrics: (id: string, el: HTMLElement | null) => { height: number; fontSize: number };
  showGuide: (axis: 'x' | 'y', position: number) => void;
  hideGuide: (axis: 'x' | 'y') => void;
};

const Ctx = createContext<EditModeCtx | null>(null);

function useEditMode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEditMode must be used within OnboardingEditProvider');
  return ctx;
}

export function OnboardingEditProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [history, dispatch] = useReducer(historyReducer, { overrides: {}, past: [], future: [] });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [primaryLabel, setPrimaryLabel] = useState<string | null>(null);
  const elementRefs = useRef<Record<string, HTMLElement | null>>({});
  const baseMetrics = useRef<Record<string, { height: number; fontSize: number }>>({});
  const labelsRef = useRef<Record<string, string>>({});
  const hGuideRef = useRef<HTMLDivElement | null>(null);
  const vGuideRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setEnabled(new URLSearchParams(window.location.search).get('edit') === '1');
  }, []);

  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: 'load', overrides: JSON.parse(raw) });
    } catch {
      // ignore corrupt/blocked storage — edit mode just starts blank
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.overrides));
    } catch {
      // ignore — nothing user-facing depends on persistence succeeding
    }
  }, [history.overrides, enabled]);

  // Click/tap anywhere that isn't a block or the toolbar → deselect.
  useEffect(() => {
    if (!enabled) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-edit-toolbar]')) return;
      setSelectedIds([]);
      setPrimaryLabel(null);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [enabled]);

  // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y.
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'redo' });
      } else if (key === 'z') {
        e.preventDefault();
        dispatch({ type: 'undo' });
      } else if (key === 'y') {
        e.preventDefault();
        dispatch({ type: 'redo' });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);

  const ctx = useMemo<EditModeCtx>(
    () => ({
      enabled,
      overrides: history.overrides,
      selectedIds,
      primaryLabel,
      selectOnly: (id, label) => {
        setSelectedIds([id]);
        setPrimaryLabel(label);
        labelsRef.current[id] = label;
      },
      toggleSelect: (id, label) => {
        labelsRef.current[id] = label;
        setSelectedIds((prev) => {
          const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
          setPrimaryLabel(next.length ? labelsRef.current[next[next.length - 1]] : null);
          return next;
        });
      },
      clearSelection: () => {
        setSelectedIds([]);
        setPrimaryLabel(null);
      },
      updateOverride: (id, patch) => dispatch({ type: 'commit', patch: { [id]: patch } }),
      commitPatch: (patch) => dispatch({ type: 'commit', patch }),
      resetSelected: () => {
        const patch: Patch = {};
        selectedIds.forEach((id) => {
          patch[id] = null;
        });
        dispatch({ type: 'commit', patch });
      },
      resetAll: () => dispatch({ type: 'resetAll' }),
      undo: () => dispatch({ type: 'undo' }),
      redo: () => dispatch({ type: 'redo' }),
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      registerEl: (id, node) => {
        elementRefs.current[id] = node;
      },
      getElementRefs: () => elementRefs.current,
      getBaseMetrics: (id, el) => {
        if (!baseMetrics.current[id] && el) {
          const rect = el.getBoundingClientRect();
          const computed = window.getComputedStyle(el);
          baseMetrics.current[id] = {
            height: rect.height || 100,
            fontSize: parseFloat(computed.fontSize) || 16,
          };
        }
        return baseMetrics.current[id] ?? { height: 100, fontSize: 16 };
      },
      showGuide: (axis, position) => {
        const el = axis === 'x' ? vGuideRef.current : hGuideRef.current;
        if (!el) return;
        el.style[axis === 'x' ? 'left' : 'top'] = `${position}px`;
        el.style.opacity = '1';
      },
      hideGuide: (axis) => {
        const el = axis === 'x' ? vGuideRef.current : hGuideRef.current;
        if (el) el.style.opacity = '0';
      },
    }),
    [enabled, history, selectedIds, primaryLabel],
  );

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {enabled && (
        <>
          <div ref={hGuideRef} className="fixed left-0 right-0 h-px bg-accent pointer-events-none z-[90] opacity-0" style={{ top: 0 }} />
          <div ref={vGuideRef} className="fixed top-0 bottom-0 w-px bg-accent pointer-events-none z-[90] opacity-0" style={{ left: 0 }} />
        </>
      )}
      {enabled && <EditModeToolbar />}
    </Ctx.Provider>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function overrideToStyle(o: Override): CSSProperties {
  return {
    transform: o.x || o.y ? `translate(${o.x ?? 0}px, ${o.y ?? 0}px)` : undefined,
    width: o.width !== undefined ? `${o.width}${o.widthUnit ?? 'px'}` : undefined,
    height: o.height !== undefined ? `${o.height}${o.heightUnit ?? 'px'}` : undefined,
    fontSize: o.fontSize ? `${o.fontSize}px` : undefined,
    fontFamily: o.fontFamily === 'sans' ? 'var(--font-heebo)' : o.fontFamily === 'display' ? 'var(--font-rubik)' : undefined,
    fontWeight: o.fontWeight,
    color: o.color || undefined,
    backgroundColor: o.backgroundColor || undefined,
  };
}

const SNAP_THRESHOLD = 6;

/**
 * Figma/Instagram-style snap: compares the dragged element's edges and
 * centers against every other block's edges/centers and returns the
 * smallest correction (if any) within SNAP_THRESHOLD, plus the guide
 * line position to display for it.
 */
function computeSnap(draggedRect: DOMRect, otherRects: DOMRect[]) {
  let dx = 0;
  let dy = 0;
  let guideX: number | undefined;
  let guideY: number | undefined;
  let bestXDelta = SNAP_THRESHOLD;
  let bestYDelta = SNAP_THRESHOLD;

  const edgesX = [draggedRect.left, draggedRect.right, (draggedRect.left + draggedRect.right) / 2];
  const edgesY = [draggedRect.top, draggedRect.bottom, (draggedRect.top + draggedRect.bottom) / 2];

  for (const rect of otherRects) {
    const otherX = [rect.left, rect.right, (rect.left + rect.right) / 2];
    const otherY = [rect.top, rect.bottom, (rect.top + rect.bottom) / 2];
    for (const dEdge of edgesX) {
      for (const oEdge of otherX) {
        const delta = oEdge - dEdge;
        if (Math.abs(delta) < bestXDelta) {
          bestXDelta = Math.abs(delta);
          dx = delta;
          guideX = oEdge;
        }
      }
    }
    for (const dEdge of edgesY) {
      for (const oEdge of otherY) {
        const delta = oEdge - dEdge;
        if (Math.abs(delta) < bestYDelta) {
          bestYDelta = Math.abs(delta);
          dy = delta;
          guideY = oEdge;
        }
      }
    }
  }

  return {
    dx: bestXDelta < SNAP_THRESHOLD ? dx : 0,
    dy: bestYDelta < SNAP_THRESHOLD ? dy : 0,
    guideX: bestXDelta < SNAP_THRESHOLD ? guideX : undefined,
    guideY: bestYDelta < SNAP_THRESHOLD ? guideY : undefined,
  };
}

function otherRectsFor(excludeIds: string[], elementRefs: Record<string, HTMLElement | null>): DOMRect[] {
  return Object.entries(elementRefs)
    .filter(([oid, el]) => el && !excludeIds.includes(oid))
    .map(([, el]) => el!.getBoundingClientRect());
}

/** Single-block drag (used when the dragged block isn't part of a multi-selection). */
function startDrag(
  e: React.PointerEvent,
  id: string,
  o: Override,
  elRef: React.RefObject<HTMLElement | null>,
  updateOverride: EditModeCtx['updateOverride'],
  getElementRefs: EditModeCtx['getElementRefs'],
  showGuide: EditModeCtx['showGuide'],
  hideGuide: EditModeCtx['hideGuide'],
) {
  e.stopPropagation();
  const startX = e.clientX;
  const startY = e.clientY;
  const baseX = o.x ?? 0;
  const baseY = o.y ?? 0;
  let pending: { x: number; y: number } | null = null;
  const onMove = (ev: PointerEvent) => {
    let x = baseX + (ev.clientX - startX);
    let y = baseY + (ev.clientY - startY);
    if (elRef.current) {
      elRef.current.style.transform = `translate(${x}px, ${y}px)`;
      const rect = elRef.current.getBoundingClientRect();
      const others = otherRectsFor([id], getElementRefs());
      const snap = computeSnap(rect, others);
      if (snap.dx || snap.dy) {
        x += snap.dx;
        y += snap.dy;
        elRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
      if (snap.guideX !== undefined) showGuide('x', snap.guideX);
      else hideGuide('x');
      if (snap.guideY !== undefined) showGuide('y', snap.guideY);
      else hideGuide('y');
    }
    pending = { x, y };
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    hideGuide('x');
    hideGuide('y');
    if (pending) updateOverride(id, pending);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

/** Group drag — moves every selected block by the same delta, preserving relative spacing. */
function startDragGroup(
  e: React.PointerEvent,
  primaryId: string,
  ids: string[],
  overrides: OverridesMap,
  elementRefs: Record<string, HTMLElement | null>,
  commitPatch: EditModeCtx['commitPatch'],
  showGuide: EditModeCtx['showGuide'],
  hideGuide: EditModeCtx['hideGuide'],
) {
  e.stopPropagation();
  const startX = e.clientX;
  const startY = e.clientY;
  const bases: Record<string, { x: number; y: number }> = {};
  ids.forEach((id) => {
    const o = overrides[id] ?? {};
    bases[id] = { x: o.x ?? 0, y: o.y ?? 0 };
  });
  let pending: Patch = {};
  const onMove = (ev: PointerEvent) => {
    let dx = ev.clientX - startX;
    let dy = ev.clientY - startY;
    const primaryEl = elementRefs[primaryId];
    if (primaryEl) {
      primaryEl.style.transform = `translate(${bases[primaryId].x + dx}px, ${bases[primaryId].y + dy}px)`;
      const rect = primaryEl.getBoundingClientRect();
      const others = otherRectsFor(ids, elementRefs);
      const snap = computeSnap(rect, others);
      dx += snap.dx;
      dy += snap.dy;
      if (snap.guideX !== undefined) showGuide('x', snap.guideX);
      else hideGuide('x');
      if (snap.guideY !== undefined) showGuide('y', snap.guideY);
      else hideGuide('y');
    }
    ids.forEach((id) => {
      const nx = bases[id].x + dx;
      const ny = bases[id].y + dy;
      pending[id] = { x: nx, y: ny };
      const el = elementRefs[id];
      if (el) el.style.transform = `translate(${nx}px, ${ny}px)`;
    });
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    hideGuide('x');
    hideGuide('y');
    if (Object.keys(pending).length) commitPatch(pending);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

type ResizeAxis = 'both' | 'width' | 'height';

function startResize(
  e: React.PointerEvent,
  id: string,
  o: Override,
  elRef: React.RefObject<HTMLElement | null>,
  updateOverride: EditModeCtx['updateOverride'],
  axis: ResizeAxis,
  getBaseMetrics: EditModeCtx['getBaseMetrics'],
) {
  e.stopPropagation();
  e.preventDefault();
  const base = getBaseMetrics(id, elRef.current);
  const rect = elRef.current?.getBoundingClientRect();
  const startX = e.clientX;
  const startY = e.clientY;
  const baseW = o.width ?? rect?.width ?? 200;
  const baseH = o.height ?? rect?.height ?? 100;
  let pending: { width?: number; height?: number } | null = null;
  const onMove = (ev: PointerEvent) => {
    const next: { width?: number; height?: number } = {};
    if (axis === 'width' || axis === 'both') next.width = Math.max(80, baseW + (ev.clientX - startX));
    if (axis === 'height' || axis === 'both') next.height = Math.max(40, baseH + (ev.clientY - startY));
    pending = next;
    if (elRef.current) {
      if (next.width !== undefined) elRef.current.style.width = `${next.width}px`;
      if (next.height !== undefined) elRef.current.style.height = `${next.height}px`;
    }
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (!pending) return;
    const patch: Partial<Override> = { ...pending, widthUnit: 'px', heightUnit: 'px' };
    // Auto-fit font size to the new height so stretching doesn't leave
    // obviously empty space — skipped once the user types a manual size.
    if (!o.fontSizeManual && pending.height !== undefined) {
      const ratio = pending.height / base.height;
      patch.fontSize = clamp(Math.round(base.fontSize * ratio), 10, 96);
    }
    updateOverride(id, patch);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function Decorations({ id, o, elRef }: { id: string; o: Override; elRef: React.RefObject<HTMLElement | null> }) {
  const {
    updateOverride,
    commitPatch,
    selectOnly,
    toggleSelect,
    selectedIds,
    primaryLabel,
    overrides,
    getElementRefs,
    getBaseMetrics,
    showGuide,
    hideGuide,
  } = useEditMode();
  const isSelected = selectedIds.includes(id);
  const isGroup = isSelected && selectedIds.length > 1;

  const onOverlayPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    if (additive) {
      toggleSelect(id, primaryLabel ?? id);
      return;
    }
    const alreadyInGroup = selectedIds.includes(id) && selectedIds.length > 1;
    if (!alreadyInGroup) selectOnly(id, id);
    if (alreadyInGroup) {
      startDragGroup(e, id, selectedIds, overrides, getElementRefs(), commitPatch, showGuide, hideGuide);
    } else {
      startDrag(e, id, o, elRef, updateOverride, getElementRefs, showGuide, hideGuide);
    }
  };

  return (
    <>
      <div
        onPointerDown={onOverlayPointerDown}
        className={cn(
          'absolute inset-0 z-40 cursor-move',
          isGroup
            ? 'ring-2 ring-brand-dark ring-inset'
            : isSelected
              ? 'ring-2 ring-accent ring-inset'
              : 'hover:ring-2 hover:ring-accent/40 ring-inset',
        )}
      />
      {isSelected && !isGroup && (
        <>
          <span className="absolute -top-6 start-0 text-[10px] font-mono font-bold bg-accent text-white px-2 py-0.5 rounded-t-md pointer-events-none z-[60] whitespace-nowrap">
            {id}
          </span>
          {/* corner — both axes */}
          <div
            onPointerDown={(e) => startResize(e, id, o, elRef, updateOverride, 'both', getBaseMetrics)}
            className="absolute -bottom-2 -start-2 size-5 rounded-full bg-accent border-2 border-white shadow-lg cursor-nwse-resize z-[60]"
          />
          {/* end edge — width only */}
          <div
            onPointerDown={(e) => startResize(e, id, o, elRef, updateOverride, 'width', getBaseMetrics)}
            className="absolute top-1/2 -translate-y-1/2 -end-1.5 w-2.5 h-8 rounded-full bg-accent/80 border-2 border-white shadow cursor-ew-resize z-[60]"
          />
          {/* bottom edge — height only */}
          <div
            onPointerDown={(e) => startResize(e, id, o, elRef, updateOverride, 'height', getBaseMetrics)}
            className="absolute start-1/2 -translate-x-1/2 -bottom-1.5 h-2.5 w-8 rounded-full bg-accent/80 border-2 border-white shadow cursor-ns-resize z-[60]"
          />
        </>
      )}
      {isGroup && (
        <span className="absolute -top-6 start-0 text-[10px] font-mono font-bold bg-brand-dark text-white px-2 py-0.5 rounded-t-md pointer-events-none z-[60] whitespace-nowrap">
          {id} · קבוצה
        </span>
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
  const { enabled, overrides, registerEl } = useEditMode();
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

  return (
    <div
      ref={(node) => {
        elRef.current = node;
        registerEl(id, node);
      }}
      className={cn(className, 'relative')}
      style={style}
    >
      {children}
      <Decorations id={id} o={o} elRef={elRef} />
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
  const { enabled, overrides, registerEl } = useEditMode();
  const elRef = useRef<HTMLElement | null>(null);
  const o = overrides[id] ?? {};
  const style = overrideToStyle(o);

  if (!enabled) {
    return cloneElement(children, { style: { ...(children.props.style || {}), ...style } });
  }

  return cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      elRef.current = node;
      registerEl(id, node);
    },
    style: { ...(children.props.style || {}), ...style },
    children: (
      <>
        {children.props.children}
        <Decorations id={id} o={o} elRef={elRef} />
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
          className="w-16 border border-border rounded px-1.5 py-1 text-xs"
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

function DimensionField({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: number | undefined;
  unit: Unit;
  onChange: (v: number | undefined, unit: Unit) => void;
}) {
  return (
    <label className="flex items-center justify-between text-xs gap-2">
      <span className="text-fg-muted">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          value={value ?? ''}
          placeholder="אוטומטי"
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined, unit)}
          className="w-16 border border-border rounded px-1.5 py-1 text-xs"
        />
        <select value={unit} onChange={(e) => onChange(value, e.target.value as Unit)} className="border border-border rounded px-1 py-1 text-xs">
          <option value="px">px</option>
          <option value="%">%</option>
        </select>
        {value !== undefined && (
          <button type="button" onClick={() => onChange(undefined, unit)} className="text-fg-dim hover:text-fg text-xs px-1">
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
  const {
    overrides,
    selectedIds,
    primaryLabel,
    updateOverride,
    resetSelected,
    resetAll,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditMode();
  const [showExport, setShowExport] = useState(false);
  const singleId = selectedIds.length === 1 ? selectedIds[0] : null;
  const o = singleId ? overrides[singleId] ?? {} : null;

  return (
    <div
      data-edit-toolbar
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:start-4 sm:w-[320px] z-[100] rounded-2xl border-2 border-accent bg-bg-elevated shadow-elevated p-4 max-h-[85vh] overflow-y-auto"
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

      <div className="flex gap-2 mb-3">
        <button
          type="button"
          disabled={!canUndo}
          onClick={undo}
          className="flex-1 text-xs border border-border rounded px-2 py-1.5 hover:bg-bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ↶ בטל (Ctrl+Z)
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={redo}
          className="flex-1 text-xs border border-border rounded px-2 py-1.5 hover:bg-bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ↷ חזור (Ctrl+Shift+Z)
        </button>
      </div>

      {selectedIds.length === 0 && (
        <p className="text-xs text-fg-muted leading-relaxed mb-3">
          לחץ על בלוק לבחירה. Shift+לחיצה מוסיפה/מסירה בלוק לבחירה מרובה — גרירה של בלוק שנמצא בבחירה מרובה מזיזה את כולם יחד
          ושומרת על הריווח ביניהם.
        </p>
      )}

      {selectedIds.length > 1 && (
        <div className="mb-3 pb-3 border-b border-border-subtle space-y-2">
          <div className="text-xs font-mono font-bold text-fg">{selectedIds.length} בלוקים נבחרו · גרור להזזה קבוצתית</div>
          <button
            type="button"
            onClick={resetSelected}
            className="w-full text-xs border border-border rounded px-2 py-1.5 hover:bg-bg-accent"
          >
            אפס בלוקים נבחרים
          </button>
        </div>
      )}

      {singleId && o && (
        <div className="space-y-2.5 mb-3 pb-3 border-b border-border-subtle">
          <div className="text-xs font-mono font-bold text-fg">{primaryLabel ?? singleId}</div>

          <DimensionField
            label="רוחב"
            value={o.width}
            unit={o.widthUnit ?? 'px'}
            onChange={(width, widthUnit) => updateOverride(singleId, { width, widthUnit })}
          />
          <DimensionField
            label="גובה"
            value={o.height}
            unit={o.heightUnit ?? 'px'}
            onChange={(height, heightUnit) => updateOverride(singleId, { height, heightUnit })}
          />

          <NumberField
            label="גודל גופן"
            value={o.fontSize}
            min={10}
            max={96}
            onChange={(fontSize) => updateOverride(singleId, { fontSize, fontSizeManual: fontSize !== undefined })}
          />

          <label className="flex items-center justify-between text-xs">
            <span className="text-fg-muted">משפחת גופן</span>
            <select
              value={o.fontFamily ?? ''}
              onChange={(e) => updateOverride(singleId, { fontFamily: (e.target.value || undefined) as Override['fontFamily'] })}
              className="border border-border rounded px-1.5 py-1 text-xs"
            >
              <option value="">ברירת מחדל</option>
              <option value="sans">Heebo (גוף)</option>
              <option value="display">Rubik (כותרות)</option>
            </select>
          </label>

          <label className="flex items-center justify-between text-xs">
            <span className="text-fg-muted">מודגש</span>
            <input
              type="checkbox"
              checked={o.fontWeight === 'bold'}
              onChange={(e) => updateOverride(singleId, { fontWeight: e.target.checked ? 'bold' : undefined })}
            />
          </label>
          <ColorField label="צבע טקסט" value={o.color} onChange={(color) => updateOverride(singleId, { color })} />
          <ColorField
            label="צבע רקע"
            value={o.backgroundColor}
            onChange={(backgroundColor) => updateOverride(singleId, { backgroundColor })}
          />
          <button
            type="button"
            onClick={resetSelected}
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
