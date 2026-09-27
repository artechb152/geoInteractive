'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ARCHIVE_AUTH_KEY,
  ARCHIVE_PASSWORD,
  ARCHIVE_SESSION_MS,
  archiveAccessRemainingMs,
  grantArchiveAccess,
  revokeArchiveAccess,
} from '@/lib/archive-access';
import { PasswordLockScreen } from '@/components/ui/PasswordLockScreen';

/**
 * שער סיסמה לארכיון — עוטף את /archive/ ואת עמודי השיעורים הארכיוניים.
 *
 * - עד שבדיקת ההרשאה ב-localStorage הסתיימה מוצג ספינר בלבד — התוכן
 *   הארכיוני לא מרונדר לרגע (וגם ה-HTML הסטטי מכיל רק את הספינר).
 * - ההרשאה תקפה שעה מרגע הכניסה. טיימר נועל את הדף בדיוק בתום השעה גם
 *   כשהוא נשאר פתוח; בדיקה חוזרת בחזרה ללשונית/פוקוס מכסה טיימרים
 *   שהדפדפן השהה ברקע, ואירוע storage מסנכרן כניסה/פקיעה בין לשוניות.
 */

type Phase = 'loading' | 'locked' | 'open';

export function ArchiveGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [expiresAt, setExpiresAt] = useState(0);
  // מועד פקיעה בזיכרון — מגבה מצב שבו localStorage חסום ולא נשמר דבר
  const memoryExpiryRef = useRef(0);

  const check = useCallback(() => {
    const now = Date.now();
    const remaining = Math.max(archiveAccessRemainingMs(), memoryExpiryRef.current - now);
    if (remaining > 0) {
      setExpiresAt(now + remaining);
      setPhase('open');
    } else {
      setExpiresAt(0);
      setPhase('locked');
    }
  }, []);

  useEffect(() => {
    check();
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === ARCHIVE_AUTH_KEY) check();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [check]);

  // נעילה אוטומטית בתום השעה, גם בלי שום אינטראקציה
  useEffect(() => {
    if (phase !== 'open' || !expiresAt) return;
    const id = window.setTimeout(() => {
      memoryExpiryRef.current = 0;
      // לשונית אחרת אולי חידשה את הכניסה בינתיים — אז רק מאריכים
      if (archiveAccessRemainingMs() === 0) revokeArchiveAccess();
      check();
    }, Math.max(0, expiresAt - Date.now()));
    return () => window.clearTimeout(id);
  }, [phase, expiresAt, check]);

  function handleUnlock() {
    grantArchiveAccess();
    memoryExpiryRef.current = Date.now() + ARCHIVE_SESSION_MS;
    check();
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
        password={ARCHIVE_PASSWORD}
        onUnlock={handleUnlock}
        eyebrow="ארכיון · גישה מורשית בלבד"
        title={
          <>
            ארכיון <span className="text-accent-hover">השיעורים</span>
          </>
        }
        description="הארכיון מוגן בסיסמה. אחרי הכניסה הגישה תקפה לשעה אחת במכשיר הזה."
      />
    );
  }

  return <>{children}</>;
}
