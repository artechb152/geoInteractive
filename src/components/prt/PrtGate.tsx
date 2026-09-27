'use client';

import { useEffect, useState } from 'react';
import {
  PRT_PASSWORD,
  PRT_SESSION_HOURS,
  PRT_AUTH_KEY,
} from '@/lib/prt-config';
import { PasswordLockScreen } from '@/components/ui/PasswordLockScreen';
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
      <div className="min-h-[calc(100vh-var(--header-h))] grid place-items-center bg-bg">
        <div className="size-6 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
      </div>
    );
  }

  if (phase === 'locked') {
    return (
      <PasswordLockScreen
        password={PRT_PASSWORD}
        onUnlock={handleUnlock}
        eyebrow="אזור מוגן · גישה מורשית בלבד"
        title={
          <>
            פרוטוטייפים <span className="text-accent-hover">לבדיקה</span>
          </>
        }
        description="העמוד מוגן בסיסמה. הזינו את הסיסמה כדי להיכנס — היא תקפה למשך 24 שעות במכשיר הזה."
      />
    );
  }

  return (
    <>
      {children}
      <NotesWidget />
    </>
  );
}
