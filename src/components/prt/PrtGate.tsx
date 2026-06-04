'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Lock, KeyRound } from 'lucide-react';
import {
  PRT_PASSWORD,
  PRT_SESSION_HOURS,
  PRT_AUTH_KEY,
} from '@/lib/prt-config';
import { NotesWidget } from './NotesWidget';

/**
 * Client-side password gate for the secret /prt area.
 *
 * Wrap any /prt route's content in <PrtGate>…</PrtGate>. On mount it
 * reads a timestamp from localStorage; if it's younger than
 * PRT_SESSION_HOURS the content renders immediately, otherwise it shows
 * a lock screen. A correct password stamps `now` into localStorage so
 * the unlock survives reloads for a day. The NotesWidget is mounted
 * alongside the content so the feedback button is present on every
 * gated page.
 *
 * Renders nothing until the localStorage check completes — this avoids
 * a hydration mismatch (server has no localStorage) and a flash of
 * protected content before the check runs.
 */

const SESSION_MS = PRT_SESSION_HOURS * 60 * 60 * 1000;

function readUnlocked(): boolean {
  try {
    const raw = localStorage.getItem(PRT_AUTH_KEY);
    if (!raw) return false;
    const { at } = JSON.parse(raw) as { at: number };
    return typeof at === 'number' && Date.now() - at < SESSION_MS;
  } catch {
    return false;
  }
}

export function PrtGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<'loading' | 'locked' | 'open'>('loading');

  useEffect(() => {
    setPhase(readUnlocked() ? 'open' : 'locked');
  }, []);

  function handleUnlock() {
    try {
      localStorage.setItem(PRT_AUTH_KEY, JSON.stringify({ at: Date.now() }));
    } catch {
      /* private mode / storage disabled — unlock for this session only */
    }
    setPhase('open');
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-[calc(100vh-3rem)] grid place-items-center bg-bg">
        <div className="size-6 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
      </div>
    );
  }

  if (phase === 'locked') {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return (
    <>
      {children}
      <NotesWidget />
    </>
  );
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value === PRT_PASSWORD) {
      onUnlock();
    } else {
      setError(true);
      setValue('');
      inputRef.current?.focus();
    }
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] grid place-items-center bg-bg topo-bg px-4 py-12">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="surface-elevated p-7 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="grid place-items-center size-12 rounded-2xl bg-accent/12 text-accent mb-5">
              <Lock className="size-5" aria-hidden />
            </div>

            <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent mb-2.5">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              אזור מוגן · גישה מורשית בלבד
            </div>

            <h1 className="font-display font-bold text-xl sm:text-2xl text-balance leading-tight mb-2">
              פרוטוטייפים <span className="text-accent-hover">לבדיקה</span>
            </h1>
            <p className="text-sm text-fg-muted leading-relaxed text-pretty mb-6">
              העמוד מוגן בסיסמה. הזינו את הסיסמה כדי להיכנס — היא תקפה למשך 24
              שעות במכשיר הזה.
            </p>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <motion.div
              animate={
                error && !reduce
                  ? { x: [0, -8, 8, -6, 6, 0] }
                  : { x: 0 }
              }
              transition={{ duration: 0.4 }}
            >
              <div className="relative">
                <KeyRound
                  className="pointer-events-none absolute top-1/2 -translate-y-1/2 end-3 size-4 text-fg-dim"
                  aria-hidden
                />
                <input
                  ref={inputRef}
                  type="password"
                  inputMode="text"
                  autoComplete="current-password"
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    if (error) setError(false);
                  }}
                  placeholder="סיסמה"
                  aria-label="סיסמה"
                  aria-invalid={error}
                  className={`w-full h-11 rounded-xl bg-bg-elevated border pe-10 ps-3 text-fg placeholder:text-fg-dim transition-colors ${
                    error
                      ? 'border-status-danger'
                      : 'border-border focus:border-accent'
                  }`}
                />
              </div>
            </motion.div>

            {error && (
              <p className="text-xs text-status-danger -mt-1" role="alert">
                סיסמה שגויה, נסו שוב.
              </p>
            )}

            <button
              type="submit"
              className="h-11 rounded-xl font-medium bg-accent text-bg-elevated hover:bg-accent-hover active:scale-[0.98] transition-all"
            >
              כניסה
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
