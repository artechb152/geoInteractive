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
 *  - Multi-selection also supports resize: dragging a handle on any
 *    member resizes every selected block by the same delta, and the
 *    panel's width/height fields apply to all selected blocks.
 *  - % sizes are measured against the block's PARENT container (the
 *    div it currently sits in), not its own original size.
 *  - "צור div חדש" creates a new container; blocks can be assigned to
 *    it from the panel and are re-parented into it (portal) with a
 *    flex-wrap layout, so cards can be regrouped freely. New containers
 *    spawn near the current viewport position, not at the page bottom.
 *  - "קבץ לאובייקט" links the multi-selection permanently (groupId):
 *    clicking any member selects the whole group, which then drags and
 *    resizes as one object. "פרק אובייקט" dissolves the link.
 *  - The panel has an objects list ("כל האובייקטים") — click an entry
 *    to select it and scroll it into view.
 *  - Ctrl+wheel zooms the SCENE (Figma-style) instead of browser page
 *    zoom; Ctrl+0 resets to 100%. Implemented with transform:scale on a
 *    wrapper — a pure view scale (no reflow), so objects keep their
 *    exact 100% layout and only the picture grows/shrinks, exactly like
 *    Figma. Pointer deltas in drag/resize are divided by the current
 *    zoom so blocks track the cursor 1:1 at any level.
 *  - Containers have a Figma-auto-layout-style direction toggle
 *    in the panel: horizontal flex-wrap row or vertical column.
 *  - Figma-style tools: V = select (default), H = hand. In hand mode a
 *    full-screen overlay grabs the pointer and pans the page; blocks
 *    can't be selected until switching back with V. Physical-key
 *    shortcuts (e.code) so they work on a Hebrew layout too.
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
import { createPortal } from 'react-dom';
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
  /** id of a user-created container div this block was assigned to. */
  parentId?: string;
  /** true for user-created container divs (created via the toolbar). */
  isContainer?: boolean;
  /** container layout direction, like Figma auto-layout: 'h' row (default) / 'v' column. */
  layoutDir?: 'h' | 'v';
  /**
   * The block's ORIGINAL (pre-override) size in layout px, captured on
   * first resize. Used to keep the block's flow footprint constant via
   * margin compensation, so resizing one block never moves its
   * neighbours — each element is independent, like in Figma.
   */
  baseW?: number;
  baseH?: number;
  /** blocks sharing a groupId behave as one object (select/drag/resize together). */
  groupId?: string;
  /** one-shot flag: container repositions itself near the viewport on mount. */
  spawnNearViewport?: boolean;
};

type OverridesMap = Record<string, Override>;
type Patch = Record<string, Partial<Override> | null>;

const STORAGE_KEY = 'topic01-onboarding-edit-overrides-v2';
const HISTORY_LIMIT = 50;

/**
 * BAKED layout — the user's exported edit-mode arrangement (2026-07-06),
 * applied as the scene's default styling in NORMAL (non-edit) mode too.
 * Edit mode starts from this state; localStorage overrides replace it
 * while editing; "איפוס הכל" clears back to the raw original design.
 *
 * NOTE: tuned on a wide desktop monitor. The x/y values are translate
 * offsets from the responsive flow position, so narrower viewports will
 * show a shifted composition until this is converted to a proper
 * responsive layout.
 */
/**
 * Permanent scene scale — the user approved the composition as it looked
 * at 86% edit-mode zoom, so the whole scene renders at 0.86 by default
 * (CSS zoom: shrinks layout too, so heights/scroll stay correct).
 * The edit-mode view zoom multiplies on top of this.
 */
const SCENE_SCALE = 0.86;

// Baked from the user's edit-mode export (2026-07-06, second pass):
// smaller history cards (400×284) and slightly raised composition.
const BAKED_OVERRIDES: OverridesMap = {
  'title-intro': { x: 297, y: -23, width: 732, widthUnit: 'px' },
  'accordion-panel': { x: 297, y: -50, width: 735, height: 439, widthUnit: 'px', heightUnit: 'px', baseH: 745, fontSize: 10 },
  'visual-frame': { x: 315, y: -359, width: 1067, height: 764, widthUnit: 'px', heightUnit: 'px', baseW: 987, baseH: 745, fontSize: 31 },
  'history-card-0': { x: 291, y: -426, width: 400, height: 284, widthUnit: 'px', heightUnit: 'px', baseW: 257, baseH: 288, fontSize: 16 },
  'history-card-1': { x: 192, y: -426, width: 400, height: 284, widthUnit: 'px', heightUnit: 'px', baseW: 257, baseH: 288, fontSize: 16 },
  'history-card-2': { x: 55, y: -426, width: 400, height: 284, widthUnit: 'px', heightUnit: 'px', baseW: 257, baseH: 288, fontSize: 16 },
  'history-card-3': { x: -104, y: -426, width: 400, height: 284, widthUnit: 'px', heightUnit: 'px', baseW: 257, baseH: 288, fontSize: 16 },
  'ready-callout': { x: 24, y: -541 },
};

// Current scene zoom (Ctrl+wheel). Module-level so the drag/resize helpers
// can convert visual pointer deltas to layout px without threading it
// through every call site. View-only — never exported or persisted.
let currentZoom = 1;

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
  selectMany: (ids: string[], label: string | null) => void;
  toggleSelectMany: (ids: string[], label: string | null) => void;
  clearSelection: () => void;
  updateOverride: (id: string, patch: Partial<Override>) => void;
  commitPatch: (patch: Patch) => void;
  resetSelected: () => void;
  resetAll: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  registerEl: (id: string, node: HTMLElement | null, label?: string) => void;
  getElementRefs: () => Record<string, HTMLElement | null>;
  getLabels: () => Record<string, string>;
  getBaseMetrics: (id: string, el: HTMLElement | null) => { height: number; fontSize: number };
  showGuide: (axis: 'x' | 'y', position: number) => void;
  hideGuide: (axis: 'x' | 'y') => void;
  /** Registered portal targets of user-created containers, keyed by container id. */
  slots: Record<string, HTMLElement | null>;
  registerSlot: (id: string, node: HTMLElement | null) => void;
  containerIds: string[];
  createContainer: () => void;
  zoom: number;
  setZoom: (z: number) => void;
  /** Figma-style tools: 'select' (V, the normal mode) or 'hand' (H, pan). */
  tool: 'select' | 'hand';
  setTool: (t: 'select' | 'hand') => void;
};

const Ctx = createContext<EditModeCtx | null>(null);

function useEditMode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEditMode must be used within OnboardingEditProvider');
  return ctx;
}

export function OnboardingEditProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  // Starts from the baked layout — normal mode renders it as-is; edit
  // mode continues from it (or from localStorage when it exists).
  const [history, dispatch] = useReducer(historyReducer, { overrides: BAKED_OVERRIDES, past: [], future: [] });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [primaryLabel, setPrimaryLabel] = useState<string | null>(null);
  const [slots, setSlots] = useState<Record<string, HTMLElement | null>>({});
  const [zoom, setZoomState] = useState(1);
  const [tool, setTool] = useState<'select' | 'hand'>('select');
  // Total visual scale = permanent scene scale × edit view zoom.
  currentZoom = zoom * SCENE_SCALE;
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
      // Don't hijack shortcuts while typing in a panel input.
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return;
      const meta = e.ctrlKey || e.metaKey;
      if (!meta && !e.altKey) {
        // Figma-style tool shortcuts (plain keypress).
        if (e.code === 'KeyH') {
          e.preventDefault();
          setTool('hand');
        } else if (e.code === 'KeyV') {
          e.preventDefault();
          setTool('select');
        }
        return;
      }
      if (!meta) return;
      // e.code (physical key) — e.key returns 'ז' on a Hebrew layout, so
      // Ctrl+Z never matched when the keyboard language was Hebrew.
      if (e.code === 'KeyZ' && e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'redo' });
      } else if (e.code === 'KeyZ') {
        e.preventDefault();
        dispatch({ type: 'undo' });
      } else if (e.code === 'KeyY') {
        e.preventDefault();
        dispatch({ type: 'redo' });
      } else if (e.code === 'Digit0' || e.code === 'Numpad0') {
        // Ctrl+0 — reset zoom to 100%, like Figma/browsers.
        e.preventDefault();
        setZoomState(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);

  // Ctrl+wheel → Figma-style scene zoom instead of browser page zoom.
  useEffect(() => {
    if (!enabled) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault(); // block the browser's full-page zoom
      setZoomState((z) => clamp(Math.round(z * Math.exp(-e.deltaY * 0.0015) * 100) / 100, 0.25, 3));
    };
    // passive:false is required — preventDefault is ignored on passive listeners.
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
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
      selectMany: (ids, label) => {
        setSelectedIds(ids);
        setPrimaryLabel(label);
      },
      toggleSelectMany: (ids, label) => {
        setSelectedIds((prev) => {
          const allIn = ids.every((i) => prev.includes(i));
          const next = allIn ? prev.filter((x) => !ids.includes(x)) : [...prev, ...ids.filter((i) => !prev.includes(i))];
          setPrimaryLabel(next.length ? label : null);
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
      registerEl: (id, node, label) => {
        elementRefs.current[id] = node;
        if (label) labelsRef.current[id] = label;
      },
      getElementRefs: () => elementRefs.current,
      getLabels: () => labelsRef.current,
      getBaseMetrics: (id, el) => {
        if (!baseMetrics.current[id] && el) {
          const rect = el.getBoundingClientRect();
          const computed = window.getComputedStyle(el);
          baseMetrics.current[id] = {
            // rect is visual px (scaled by scene zoom) — store layout px.
            height: rect.height / currentZoom || 100,
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
      slots,
      registerSlot: (id, node) => {
        setSlots((prev) => {
          const cur = prev[id];
          if (node === null) {
            // React re-runs inline ref callbacks (null → node) every render;
            // ignore the null while the element is still in the DOM, otherwise
            // the state ping-pongs and React hits its update-depth limit.
            if (!cur || cur.isConnected) return prev;
            return { ...prev, [id]: null };
          }
          return cur === node ? prev : { ...prev, [id]: node };
        });
      },
      containerIds: Object.keys(history.overrides).filter((id) => history.overrides[id]?.isContainer),
      createContainer: () => {
        let n = 1;
        while (history.overrides[`div-${n}`]) n++;
        dispatch({ type: 'commit', patch: { [`div-${n}`]: { isContainer: true, spawnNearViewport: true } } });
      },
      zoom,
      setZoom: (z) => setZoomState(clamp(z, 0.25, 3)),
      tool,
      setTool,
    }),
    [enabled, history, selectedIds, primaryLabel, slots, zoom, tool],
  );

  return (
    <Ctx.Provider value={ctx}>
      {/* Always-present wrapper so toggling edit mode doesn't remount the
          scene (the WebGL canvas). CSS zoom applies the PERMANENT scene
          scale (0.86 — shrinks layout too, so heights stay correct);
          transform:scale on top is the edit-mode VIEW zoom — pure view,
          no reflow (Figma-style). Drag/resize helpers divide pointer
          deltas by currentZoom (the product of both). */}
      <div
        style={
          {
            zoom: SCENE_SCALE,
            ...(enabled && zoom !== 1 ? { transform: `scale(${zoom})`, transformOrigin: '50% 0' } : null),
          } as CSSProperties
        }
      >
        {children}
        {enabled && ctx.containerIds.map((cid) => <UserContainer key={cid} id={cid} />)}
      </div>
      {enabled && (
        <>
          <div ref={hGuideRef} className="fixed left-0 right-0 h-px bg-accent pointer-events-none z-[90] opacity-0" style={{ top: 0 }} />
          <div ref={vGuideRef} className="fixed top-0 bottom-0 w-px bg-accent pointer-events-none z-[90] opacity-0" style={{ left: 0 }} />
        </>
      )}
      {enabled && tool === 'hand' && <HandPanOverlay />}
      {enabled && <EditModeToolbar />}
    </Ctx.Provider>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Hand tool (H) — a full-screen overlay above the scene (below the
 * toolbar) that turns pointer drags into page panning, Figma-style.
 * It also blocks block selection while active. Marked data-edit-toolbar
 * so panning doesn't clear the current selection.
 */
function HandPanOverlay() {
  const startPan = (e: React.PointerEvent) => {
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    const startX = e.clientX;
    const startY = e.clientY;
    const sx = window.scrollX;
    const sy = window.scrollY;
    el.style.cursor = 'grabbing';
    const onMove = (ev: PointerEvent) => {
      window.scrollTo(sx - (ev.clientX - startX), sy - (ev.clientY - startY));
    };
    const onUp = () => {
      el.style.cursor = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return <div data-edit-toolbar onPointerDown={startPan} className="fixed inset-0 z-[85] cursor-grab" />;
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

/**
 * Live style for a block. In edit mode, %-unit sizes are resolved
 * against the block's PARENT element (the div it currently sits in) —
 * i.e. "50%" means half the container's width, not half of whatever
 * CSS box the grid originally gave the block. Re-measures on window
 * resize and once after mount (the first render has no ref yet).
 */
function useOverrideStyle(o: Override, elRef: React.RefObject<HTMLElement | null>, enabled: boolean): CSSProperties {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const usesPercent =
    (o.width !== undefined && (o.widthUnit ?? 'px') === '%') ||
    (o.height !== undefined && (o.heightUnit ?? 'px') === '%');

  useEffect(() => {
    if (!enabled || !usesPercent) return;
    force(); // re-render now that elRef is populated
    window.addEventListener('resize', force);
    return () => window.removeEventListener('resize', force);
  }, [enabled, usesPercent]);

  const style = overrideToStyle(o);
  if (enabled && usesPercent) {
    const parent = elRef.current?.parentElement;
    if (parent) {
      if (o.width !== undefined && (o.widthUnit ?? 'px') === '%') {
        style.width = `${Math.round((parent.clientWidth * o.width) / 100)}px`;
      }
      if (o.height !== undefined && (o.heightUnit ?? 'px') === '%') {
        style.height = `${Math.round((parent.clientHeight * o.height) / 100)}px`;
      }
    }
  }
  // Independence: compensate the size change with margins so the block's
  // footprint in the flow stays its ORIGINAL size — resizing one element
  // never pushes or pulls its neighbours (it overlaps instead, like Figma).
  const widthPx = typeof style.width === 'string' && style.width.endsWith('px') ? parseFloat(style.width) : undefined;
  if (widthPx !== undefined && o.baseW !== undefined) {
    style.marginInlineEnd = `${Math.round(o.baseW - widthPx)}px`;
  }
  const heightPx = typeof style.height === 'string' && style.height.endsWith('px') ? parseFloat(style.height) : undefined;
  if (heightPx !== undefined && o.baseH !== undefined) {
    style.marginBottom = `${Math.round(o.baseH - heightPx)}px`;
  }
  return style;
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
    // Pointer deltas are visual px; transform runs in layout px → ÷ zoom.
    let x = baseX + (ev.clientX - startX) / currentZoom;
    let y = baseY + (ev.clientY - startY) / currentZoom;
    if (elRef.current) {
      elRef.current.style.transform = `translate(${x}px, ${y}px)`;
      const rect = elRef.current.getBoundingClientRect();
      const others = otherRectsFor([id], getElementRefs());
      const snap = computeSnap(rect, others);
      if (snap.dx || snap.dy) {
        x += snap.dx / currentZoom;
        y += snap.dy / currentZoom;
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
    let dx = (ev.clientX - startX) / currentZoom;
    let dy = (ev.clientY - startY) / currentZoom;
    const primaryEl = elementRefs[primaryId];
    if (primaryEl) {
      primaryEl.style.transform = `translate(${bases[primaryId].x + dx}px, ${bases[primaryId].y + dy}px)`;
      const rect = primaryEl.getBoundingClientRect();
      const others = otherRectsFor(ids, elementRefs);
      const snap = computeSnap(rect, others);
      dx += snap.dx / currentZoom;
      dy += snap.dy / currentZoom;
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
  // When the stored value is in %, the on-screen rect is the real px base
  // (divided by zoom — rects are visual px, styles are layout px).
  const baseW = o.width !== undefined && (o.widthUnit ?? 'px') === 'px' ? o.width : rect ? rect.width / currentZoom : 200;
  const baseH = o.height !== undefined && (o.heightUnit ?? 'px') === 'px' ? o.height : rect ? rect.height / currentZoom : 100;
  let pending: { width?: number; height?: number } | null = null;
  const onMove = (ev: PointerEvent) => {
    const next: { width?: number; height?: number } = {};
    // RTL: the width handles sit on the inline-end (visual LEFT) edge and
    // the block grows leftward — dragging LEFT must increase the width,
    // so the horizontal delta is negated.
    if (axis === 'width' || axis === 'both') next.width = Math.max(24, baseW - (ev.clientX - startX) / currentZoom);
    if (axis === 'height' || axis === 'both') next.height = Math.max(16, baseH + (ev.clientY - startY) / currentZoom);
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
    // Remember the original footprint so the flow keeps reserving it
    // (margin compensation — neighbours stay put).
    if (pending.width !== undefined && o.baseW === undefined) patch.baseW = Math.round(baseW);
    if (pending.height !== undefined && o.baseH === undefined) patch.baseH = Math.round(baseH);
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

/** Group resize — applies the same px delta to every selected block. */
function startResizeGroup(
  e: React.PointerEvent,
  ids: string[],
  overrides: OverridesMap,
  elementRefs: Record<string, HTMLElement | null>,
  commitPatch: EditModeCtx['commitPatch'],
  axis: ResizeAxis,
  getBaseMetrics: EditModeCtx['getBaseMetrics'],
) {
  e.stopPropagation();
  e.preventDefault();
  const startX = e.clientX;
  const startY = e.clientY;
  const bases: Record<string, { w: number; h: number }> = {};
  ids.forEach((id) => {
    const o = overrides[id] ?? {};
    const rect = elementRefs[id]?.getBoundingClientRect();
    bases[id] = {
      w: o.width !== undefined && (o.widthUnit ?? 'px') === 'px' ? o.width : rect ? rect.width / currentZoom : 200,
      h: o.height !== undefined && (o.heightUnit ?? 'px') === 'px' ? o.height : rect ? rect.height / currentZoom : 100,
    };
  });
  let pending: Record<string, { width?: number; height?: number }> = {};
  const onMove = (ev: PointerEvent) => {
    // RTL: horizontal delta negated — see startResize.
    const dx = -(ev.clientX - startX) / currentZoom;
    const dy = (ev.clientY - startY) / currentZoom;
    pending = {};
    ids.forEach((id) => {
      const next: { width?: number; height?: number } = {};
      if (axis === 'width' || axis === 'both') next.width = Math.max(24, bases[id].w + dx);
      if (axis === 'height' || axis === 'both') next.height = Math.max(16, bases[id].h + dy);
      pending[id] = next;
      const el = elementRefs[id];
      if (el) {
        if (next.width !== undefined) el.style.width = `${next.width}px`;
        if (next.height !== undefined) el.style.height = `${next.height}px`;
      }
    });
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (!Object.keys(pending).length) return;
    const patch: Patch = {};
    ids.forEach((id) => {
      const p = pending[id];
      if (!p) return;
      const o = overrides[id] ?? {};
      const entry: Partial<Override> = { ...p };
      if (p.width !== undefined) entry.widthUnit = 'px';
      if (p.height !== undefined) entry.heightUnit = 'px';
      if (p.width !== undefined && o.baseW === undefined) entry.baseW = Math.round(bases[id].w);
      if (p.height !== undefined && o.baseH === undefined) entry.baseH = Math.round(bases[id].h);
      if (!o.fontSizeManual && p.height !== undefined) {
        const base = getBaseMetrics(id, elementRefs[id]);
        entry.fontSize = clamp(Math.round(base.fontSize * (p.height / base.height)), 10, 96);
      }
      patch[id] = entry;
    });
    commitPatch(patch);
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
    selectMany,
    toggleSelectMany,
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
    // A block linked into a permanent group always acts as the whole group.
    const groupMembers =
      o.groupId != null
        ? Object.keys(overrides).filter((k) => overrides[k]?.groupId === o.groupId)
        : null;
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    if (additive) {
      if (groupMembers && groupMembers.length > 1) toggleSelectMany(groupMembers, o.groupId ?? null);
      else toggleSelect(id, primaryLabel ?? id);
      return;
    }
    const alreadyInGroup = selectedIds.includes(id) && selectedIds.length > 1;
    if (alreadyInGroup) {
      startDragGroup(e, id, selectedIds, overrides, getElementRefs(), commitPatch, showGuide, hideGuide);
    } else if (groupMembers && groupMembers.length > 1) {
      selectMany(groupMembers, o.groupId ?? null);
      startDragGroup(e, id, groupMembers, overrides, getElementRefs(), commitPatch, showGuide, hideGuide);
    } else {
      selectOnly(id, id);
      startDrag(e, id, o, elRef, updateOverride, getElementRefs, showGuide, hideGuide);
    }
  };

  // Everything here renders as <span> (not <div>) so blocks nested inside
  // <p>/<h3> stay valid HTML — a div inside p breaks React hydration.
  return (
    <>
      <span
        onPointerDown={onOverlayPointerDown}
        className={cn(
          'block absolute inset-0 z-40 cursor-move',
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
          {/* corner — both axes. Sits at the inline-end (visual left in
              RTL) bottom corner — the edge that actually moves when the
              block grows, so the handle follows the cursor. */}
          <span
            onPointerDown={(e) => startResize(e, id, o, elRef, updateOverride, 'both', getBaseMetrics)}
            className="block absolute -bottom-2 -end-2 size-5 rounded-full bg-accent border-2 border-white shadow-lg cursor-nesw-resize z-[60]"
          />
          {/* end edge — width only */}
          <span
            onPointerDown={(e) => startResize(e, id, o, elRef, updateOverride, 'width', getBaseMetrics)}
            className="block absolute top-1/2 -translate-y-1/2 -end-1.5 w-2.5 h-8 rounded-full bg-accent/80 border-2 border-white shadow cursor-ew-resize z-[60]"
          />
          {/* bottom edge — height only */}
          <span
            onPointerDown={(e) => startResize(e, id, o, elRef, updateOverride, 'height', getBaseMetrics)}
            className="block absolute start-1/2 -translate-x-1/2 -bottom-1.5 h-2.5 w-8 rounded-full bg-accent/80 border-2 border-white shadow cursor-ns-resize z-[60]"
          />
        </>
      )}
      {isGroup && (
        <>
          <span className="absolute -top-6 start-0 text-[10px] font-mono font-bold bg-brand-dark text-white px-2 py-0.5 rounded-t-md pointer-events-none z-[60] whitespace-nowrap">
            {id} · קבוצה
          </span>
          {/* group resize — same delta applied to every selected block */}
          <span
            onPointerDown={(e) => startResizeGroup(e, selectedIds, overrides, getElementRefs(), commitPatch, 'both', getBaseMetrics)}
            className="block absolute -bottom-2 -end-2 size-5 rounded-full bg-brand-dark border-2 border-white shadow-lg cursor-nesw-resize z-[60]"
          />
          <span
            onPointerDown={(e) => startResizeGroup(e, selectedIds, overrides, getElementRefs(), commitPatch, 'width', getBaseMetrics)}
            className="block absolute top-1/2 -translate-y-1/2 -end-1.5 w-2.5 h-8 rounded-full bg-brand-dark/80 border-2 border-white shadow cursor-ew-resize z-[60]"
          />
          <span
            onPointerDown={(e) => startResizeGroup(e, selectedIds, overrides, getElementRefs(), commitPatch, 'height', getBaseMetrics)}
            className="block absolute start-1/2 -translate-x-1/2 -bottom-1.5 h-2.5 w-8 rounded-full bg-brand-dark/80 border-2 border-white shadow cursor-ns-resize z-[60]"
          />
        </>
      )}
    </>
  );
}

/**
 * Drop-in replacement for a plain wrapper div. Safe for any ordinary content.
 *  - `as="span"` renders a span instead (for editable text nested inside
 *    headings/paragraphs — pass className="block" for a block box).
 *  - `nested` lifts the block above its parent block's selection overlay
 *    (z-45 > overlay z-40) so inner titles/text stay clickable inside cards.
 *  - If the block was assigned to a user-created container (parentId), it
 *    is re-parented into that container via a portal while editing.
 */
export function EditableBlock({
  id,
  label,
  className,
  children,
  as = 'div',
  nested = false,
}: {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
  as?: 'div' | 'span';
  nested?: boolean;
}) {
  const { enabled, overrides, registerEl, slots } = useEditMode();
  const elRef = useRef<HTMLElement | null>(null);
  const o = overrides[id] ?? {};
  const style = useOverrideStyle(o, elRef, enabled);
  const As = as as 'div';

  if (!enabled) {
    // Baked edit-mode overrides (absolute x/y + fixed px sizes tuned for one
    // monitor) must never leak into normal rendering — they break layout at
    // other viewport widths. Only apply them while the visual editor is on.
    return <As className={className}>{children}</As>;
  }

  const block = (
    <As
      ref={(node: HTMLElement | null) => {
        elRef.current = node;
        registerEl(id, node, label);
      }}
      className={cn(className, 'relative', nested && 'z-[45]')}
      style={style}
    >
      {children}
      <Decorations id={id} o={o} elRef={elRef} />
    </As>
  );

  // Re-parent into the assigned container div (if it exists on screen).
  const slotEl = o.parentId ? slots[o.parentId] : null;
  if (o.parentId && slotEl) return createPortal(block, slotEl);
  return block;
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
  const style = useOverrideStyle(o, elRef, enabled);

  if (!enabled) {
    // See EditableBlock — baked overrides are edit-mode-only.
    return children;
  }

  return cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      elRef.current = node;
      registerEl(id, node, label);
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

/**
 * User-created container div ("צור div חדש"). Rendered by the provider
 * after the scene content, only while edit mode is on. Blocks assigned
 * to it (via the panel's "שייך ל-div" select) portal into its flex-wrap
 * slot. Drag by the name tab; resize with the handles; select it to
 * edit width/height/background from the panel like any block.
 */
function UserContainer({ id }: { id: string }) {
  const {
    overrides,
    selectedIds,
    selectOnly,
    toggleSelect,
    updateOverride,
    getElementRefs,
    getBaseMetrics,
    showGuide,
    hideGuide,
    registerEl,
    registerSlot,
  } = useEditMode();
  const elRef = useRef<HTMLDivElement | null>(null);
  const o = overrides[id] ?? {};
  const style = useOverrideStyle(o, elRef, true);
  const isSelected = selectedIds.includes(id);
  const memberCount = Object.values(overrides).filter((m) => m?.parentId === id).length;

  // New containers mount at the end of the scene (document flow) but the
  // user created them while looking somewhere mid-page — translate the
  // container up into the current viewport once, then clear the flag.
  useEffect(() => {
    if (!o.spawnNearViewport || !elRef.current) return;
    const rect = elRef.current.getBoundingClientRect();
    const dy = Math.round((window.innerHeight * 0.25 - rect.top) / currentZoom);
    updateOverride(id, { y: (o.y ?? 0) + dy, spawnNearViewport: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.spawnNearViewport]);

  return (
    <div
      ref={(node) => {
        elRef.current = node;
        registerEl(id, node, id);
      }}
      style={style}
      className={cn(
        'relative mt-8 min-h-[140px] rounded-[4px] border-2 border-dashed p-4',
        isSelected ? 'border-accent bg-accent/5' : 'border-accent/40',
      )}
    >
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          if (e.shiftKey || e.ctrlKey || e.metaKey) {
            toggleSelect(id, id);
            return;
          }
          selectOnly(id, id);
          startDrag(e, id, o, elRef, updateOverride, getElementRefs, showGuide, hideGuide);
        }}
        className="absolute -top-3 start-3 z-[60] cursor-move select-none rounded bg-accent px-2 py-0.5 text-[10px] font-mono font-bold text-white"
      >
        ⠿ {id}
      </div>
      {memberCount === 0 && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-fg-dim">
          div ריק — בחר בלוק ובפאנל בחר "שייך ל-div" → {id}
        </span>
      )}
      <div
        ref={(node) => registerSlot(id, node)}
        className={cn(
          'flex min-h-[100px] gap-4',
          (o.layoutDir ?? 'h') === 'v' ? 'flex-col items-stretch' : 'flex-wrap items-start',
        )}
      />
      {isSelected && (
        <>
          <div
            onPointerDown={(e) => startResize(e, id, o, elRef, updateOverride, 'both', getBaseMetrics)}
            className="absolute -bottom-2 -end-2 z-[60] size-5 cursor-nesw-resize rounded-full border-2 border-white bg-accent shadow-lg"
          />
          <div
            onPointerDown={(e) => startResize(e, id, o, elRef, updateOverride, 'width', getBaseMetrics)}
            className="absolute -end-1.5 top-1/2 z-[60] h-8 w-2.5 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-white bg-accent/80 shadow"
          />
          <div
            onPointerDown={(e) => startResize(e, id, o, elRef, updateOverride, 'height', getBaseMetrics)}
            className="absolute -bottom-1.5 start-1/2 z-[60] h-2.5 w-8 -translate-x-1/2 cursor-ns-resize rounded-full border-2 border-white bg-accent/80 shadow"
          />
        </>
      )}
    </div>
  );
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
          min={0}
          value={value ?? ''}
          placeholder="אוטומטי"
          onChange={(e) => onChange(e.target.value ? Math.max(0, Number(e.target.value)) : undefined, unit)}
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

/** "שייך ל-div" select — assigns the given blocks to a user container. */
function ParentSelect({ ids }: { ids: string[] }) {
  const { overrides, containerIds, commitPatch } = useEditMode();
  const options = containerIds.filter((cid) => !ids.includes(cid));
  const current = ids.length === 1 ? overrides[ids[0]]?.parentId ?? '' : '';
  if (containerIds.length === 0) return null;
  return (
    <label className="flex items-center justify-between text-xs gap-2">
      <span className="text-fg-muted">שייך ל-div</span>
      <select
        value={current}
        onChange={(e) => {
          const parentId = e.target.value || undefined;
          const patch: Patch = {};
          ids.forEach((id) => {
            // Containers can't be nested into containers.
            if (!overrides[id]?.isContainer) patch[id] = { parentId };
          });
          commitPatch(patch);
        }}
        className="border border-border rounded px-1.5 py-1 text-xs max-w-[140px]"
      >
        <option value="">ללא (מקום מקורי)</option>
        {options.map((cid) => (
          <option key={cid} value={cid}>
            {cid}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Objects list — every registered block/container, with permanent groups
 * shown as single entries. Click selects and scrolls it into view.
 */
function ObjectsList() {
  const { overrides, selectedIds, selectOnly, selectMany, getElementRefs, getLabels } = useEditMode();
  const [, force] = useReducer((x: number) => x + 1, 0);
  // refs are attached after the first render — refresh once so the list fills.
  useEffect(() => {
    force();
  }, []);
  const refs = getElementRefs();
  const labels = getLabels();
  const ids = Object.keys(refs).filter((id) => refs[id]);
  const groups: Record<string, string[]> = {};
  ids.forEach((id) => {
    const g = overrides[id]?.groupId;
    if (g) (groups[g] ??= []).push(id);
  });
  const ungrouped = ids.filter((id) => !overrides[id]?.groupId);

  const goTo = (targetIds: string[], label: string) => {
    if (targetIds.length === 1) selectOnly(targetIds[0], label);
    else selectMany(targetIds, label);
    refs[targetIds[0]]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const rowCls = (active: boolean) =>
    cn(
      'w-full text-start text-xs rounded px-2 py-1 truncate',
      active ? 'bg-accent/15 text-accent font-semibold' : 'hover:bg-bg-accent text-fg-muted',
    );

  return (
    <details className="mb-3 pb-3 border-b border-border-subtle">
      <summary className="cursor-pointer text-xs font-semibold text-fg select-none">
        📋 כל האובייקטים ({Object.keys(groups).length + ungrouped.length})
      </summary>
      <div className="mt-1.5 max-h-44 overflow-y-auto space-y-0.5">
        {Object.entries(groups).map(([gid, members]) => (
          <button
            key={gid}
            type="button"
            onClick={() => goTo(members, gid)}
            className={rowCls(members.every((m) => selectedIds.includes(m)))}
          >
            🔗 {gid} · {members.length} בלוקים
          </button>
        ))}
        {ungrouped.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => goTo([id], labels[id] ?? id)}
            className={rowCls(selectedIds.includes(id))}
          >
            {overrides[id]?.isContainer ? '▣ ' : ''}
            {labels[id] ?? id}
          </button>
        ))}
      </div>
    </details>
  );
}

function EditModeToolbar() {
  const {
    overrides,
    selectedIds,
    primaryLabel,
    updateOverride,
    commitPatch,
    resetSelected,
    resetAll,
    undo,
    redo,
    canUndo,
    canRedo,
    getElementRefs,
    createContainer,
    zoom,
    setZoom,
    tool,
    setTool,
  } = useEditMode();
  const [showExport, setShowExport] = useState(false);
  const singleId = selectedIds.length === 1 ? selectedIds[0] : null;
  const o = singleId ? overrides[singleId] ?? {} : null;
  const primaryO = selectedIds.length > 1 ? overrides[selectedIds[selectedIds.length - 1]] ?? {} : null;
  const selectionHasGroup = selectedIds.some((id) => overrides[id]?.groupId);

  const groupSelected = () => {
    const used = new Set(Object.values(overrides).map((v) => v?.groupId).filter(Boolean));
    let n = 1;
    while (used.has(`group-${n}`)) n++;
    const patch: Patch = {};
    selectedIds.forEach((id) => {
      patch[id] = { groupId: `group-${n}` };
    });
    commitPatch(patch);
  };

  const ungroupSelected = () => {
    const gids = new Set(selectedIds.map((id) => overrides[id]?.groupId).filter(Boolean));
    const patch: Patch = {};
    Object.keys(overrides).forEach((id) => {
      const g = overrides[id]?.groupId;
      if (g && gids.has(g)) patch[id] = { groupId: undefined };
    });
    commitPatch(patch);
  };

  // Converts a size value between px and % using the block's PARENT box,
  // so toggling the unit keeps the block the same size on screen.
  const convertUnit = (id: string, value: number | undefined, from: Unit, to: Unit, dim: 'w' | 'h') => {
    if (value === undefined || from === to) return value;
    const parent = getElementRefs()[id]?.parentElement;
    const size = parent ? (dim === 'w' ? parent.clientWidth : parent.clientHeight) : 0;
    if (!size) return value;
    return to === '%' ? Math.round((value / size) * 1000) / 10 : Math.round((value / 100) * size);
  };

  // First size change from the panel: remember the block's original
  // footprint so its neighbours don't move (margin compensation).
  const ensureBase = (id: string, patch: Partial<Override>): Partial<Override> => {
    const cur = overrides[id] ?? {};
    const el = getElementRefs()[id];
    if (!el) return patch;
    const rect = el.getBoundingClientRect();
    const out = { ...patch };
    if (out.width !== undefined && cur.baseW === undefined && cur.width === undefined) {
      out.baseW = Math.round(rect.width / currentZoom);
    }
    if (out.height !== undefined && cur.baseH === undefined && cur.height === undefined) {
      out.baseH = Math.round(rect.height / currentZoom);
    }
    return out;
  };

  return (
    <div
      data-edit-toolbar
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:start-4 sm:w-[320px] z-[100] rounded-[4px] border-2 border-accent bg-bg-elevated shadow-elevated p-4 max-h-[85vh] overflow-y-auto"
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

      <div className="flex items-center gap-1.5 mb-3 text-xs">
        <span className="text-fg-muted">כלי</span>
        <button
          type="button"
          onClick={() => setTool('select')}
          title="בחירה — המצב הרגיל (V)"
          className={cn(
            'flex-1 border rounded px-2 py-1 font-semibold',
            tool === 'select' ? 'bg-accent text-white border-accent' : 'border-border hover:bg-bg-accent',
          )}
        >
          ↖ בחירה (V)
        </button>
        <button
          type="button"
          onClick={() => setTool('hand')}
          title="יד — גרירת העמוד (H)"
          className={cn(
            'flex-1 border rounded px-2 py-1 font-semibold',
            tool === 'hand' ? 'bg-accent text-white border-accent' : 'border-border hover:bg-bg-accent',
          )}
        >
          ✋ יד (H)
        </button>
      </div>

      <div className="flex items-center gap-1.5 mb-3 text-xs">
        <span className="text-fg-muted">זום (Ctrl+גלגלת)</span>
        <button
          type="button"
          onClick={() => setZoom(zoom - 0.1)}
          className="size-6 border border-border rounded hover:bg-bg-accent font-bold"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          title="איפוס (Ctrl+0)"
          className="min-w-12 border border-border rounded px-1.5 py-1 hover:bg-bg-accent font-mono"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() => setZoom(zoom + 0.1)}
          className="size-6 border border-border rounded hover:bg-bg-accent font-bold"
        >
          +
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

      <ObjectsList />

      {selectedIds.length === 0 && (
        <p className="text-xs text-fg-muted leading-relaxed mb-3">
          לחץ על בלוק לבחירה. Shift+לחיצה מוסיפה/מסירה בלוק לבחירה מרובה — גרירה של בלוק שנמצא בבחירה מרובה מזיזה את כולם יחד
          ושומרת על הריווח ביניהם.
        </p>
      )}

      {selectedIds.length > 1 && primaryO && (
        <div className="mb-3 pb-3 border-b border-border-subtle space-y-2.5">
          <div className="text-xs font-mono font-bold text-fg">
            {selectedIds.length} בלוקים נבחרו · גרור להזזה קבוצתית · ידיות לשינוי גודל של כולם
          </div>
          <DimensionField
            label="רוחב (לכולם)"
            value={primaryO.width}
            unit={primaryO.widthUnit ?? 'px'}
            onChange={(width, widthUnit) => {
              const patch: Patch = {};
              selectedIds.forEach((id) => {
                patch[id] = ensureBase(id, { width, widthUnit });
              });
              commitPatch(patch);
            }}
          />
          <DimensionField
            label="גובה (לכולם)"
            value={primaryO.height}
            unit={primaryO.heightUnit ?? 'px'}
            onChange={(height, heightUnit) => {
              const patch: Patch = {};
              selectedIds.forEach((id) => {
                patch[id] = ensureBase(id, { height, heightUnit });
              });
              commitPatch(patch);
            }}
          />
          <ParentSelect ids={selectedIds} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={groupSelected}
              className="flex-1 text-xs font-semibold border border-accent text-accent rounded px-2 py-1.5 hover:bg-accent/10"
            >
              🔗 קבץ לאובייקט
            </button>
            {selectionHasGroup && (
              <button
                type="button"
                onClick={ungroupSelected}
                className="flex-1 text-xs border border-border rounded px-2 py-1.5 hover:bg-bg-accent"
              >
                ✂ פרק אובייקט
              </button>
            )}
          </div>
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
            onChange={(width, widthUnit) =>
              updateOverride(
                singleId,
                ensureBase(singleId, {
                  width: convertUnit(singleId, width, o.widthUnit ?? 'px', widthUnit, 'w'),
                  widthUnit,
                }),
              )
            }
          />
          <DimensionField
            label="גובה"
            value={o.height}
            unit={o.heightUnit ?? 'px'}
            onChange={(height, heightUnit) =>
              updateOverride(
                singleId,
                ensureBase(singleId, {
                  height: convertUnit(singleId, height, o.heightUnit ?? 'px', heightUnit, 'h'),
                  heightUnit,
                }),
              )
            }
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
          {o.isContainer && (
            <label className="flex items-center justify-between text-xs gap-2">
              <span className="text-fg-muted">פריסה (Auto-layout)</span>
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={() => updateOverride(singleId, { layoutDir: 'h' })}
                  className={cn(
                    'size-7 border rounded font-bold',
                    (o.layoutDir ?? 'h') === 'h'
                      ? 'bg-accent text-white border-accent'
                      : 'border-border hover:bg-bg-accent',
                  )}
                  title="אופקי — פריטים זה לצד זה"
                >
                  ↔
                </button>
                <button
                  type="button"
                  onClick={() => updateOverride(singleId, { layoutDir: 'v' })}
                  className={cn(
                    'size-7 border rounded font-bold',
                    o.layoutDir === 'v'
                      ? 'bg-accent text-white border-accent'
                      : 'border-border hover:bg-bg-accent',
                  )}
                  title="אנכי — פריטים זה מתחת לזה"
                >
                  ↕
                </button>
              </span>
            </label>
          )}
          {!o.isContainer && <ParentSelect ids={[singleId]} />}
          {o.groupId && (
            <button
              type="button"
              onClick={ungroupSelected}
              className="w-full text-xs border border-border rounded px-2 py-1.5 hover:bg-bg-accent"
            >
              ✂ פרק אובייקט ({o.groupId})
            </button>
          )}
          <button
            type="button"
            onClick={resetSelected}
            className="w-full text-xs border border-border rounded px-2 py-1.5 hover:bg-bg-accent"
          >
            אפס בלוק זה
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={createContainer}
        className="w-full mb-2 text-xs border border-dashed border-accent text-accent rounded px-2 py-1.5 hover:bg-accent/10"
      >
        ➕ צור div חדש (מיכל לכרטיסיות)
      </button>

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
      <div className="bg-bg-elevated rounded-[4px] p-4 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
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
