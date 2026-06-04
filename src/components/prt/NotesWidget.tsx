'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { MessageSquarePlus, X, Send, Check, Loader2 } from 'lucide-react';
import { NOTES_ENDPOINT } from '@/lib/prt-config';
import { getPrototype } from '@/lib/prt-prototypes';

/**
 * Floating feedback button for the /prt area. Pinned to the bottom-right
 * of the viewport, it opens a small panel where any visitor can leave a
 * note — no accounts, no login. On submit the note is POSTed to the
 * Google Apps Script endpoint (NOTES_ENDPOINT), which appends it to your
 * Google Sheet.
 *
 * Apps Script web apps don't return CORS headers, so we POST with
 * `mode: 'no-cors'` and a text/plain body (a "simple" request that skips
 * the preflight). That makes the response opaque — we can't read a
 * status — so a resolved fetch is treated as success. The script still
 * receives the body in `e.postData.contents`.
 */

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function NotesWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  // Esc closes the panel.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function currentContext(): string {
    const match = pathname?.match(/\/prt\/([^/]+)/);
    if (match) {
      const proto = getPrototype(match[1]);
      return proto ? `פרוטוטייפ: ${proto.title}` : `פרוטוטייפ: ${match[1]}`;
    }
    return 'עמוד הפרוטוטייפים (/prt)';
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (!text || status === 'sending') return;

    if (!NOTES_ENDPOINT) {
      // Endpoint not pasted into prt-config yet.
      setStatus('error');
      return;
    }

    setStatus('sending');
    const payload = {
      message: text,
      name: name.trim() || 'אנונימי',
      context: currentContext(),
      path: pathname,
      url: typeof window !== 'undefined' ? window.location.href : '',
      ts: new Date().toISOString(),
      userAgent:
        typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    try {
      await fetch(NOTES_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      setStatus('sent');
      setMessage('');
      setName('');
    } catch {
      setStatus('error');
    }
  }

  return (
    <>
      {/* Floating launcher — physical bottom-right, above the navbar. */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (status === 'sent' || status === 'error') setStatus('idle');
        }}
        aria-label={open ? 'סגירת הערות' : 'השארת הערה'}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-[60] grid place-items-center size-14 rounded-full bg-accent text-bg-elevated shadow-elevated hover:bg-accent-hover active:scale-95 transition-all"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="x"
              initial={reduce ? false : { rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={reduce ? undefined : { rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="size-6" aria-hidden />
            </motion.span>
          ) : (
            <motion.span
              key="chat"
              initial={reduce ? false : { rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={reduce ? undefined : { rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageSquarePlus className="size-6" aria-hidden />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="notes-panel"
            role="dialog"
            aria-label="השארת הערה"
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-24 right-5 z-[60] w-[calc(100vw-2.5rem)] max-w-sm surface-elevated p-5 sm:p-6"
          >
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent mb-2">
                <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                משוב
              </div>
              <h2 className="font-display font-bold text-lg text-balance leading-tight">
                יש לכם הערה?
              </h2>
              <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                כל הערה מגיעה ישירות אליי. אין צורך בהרשמה.
              </p>
            </div>

            {status === 'sent' ? (
              <div className="flex flex-col items-center text-center py-6">
                <div className="grid place-items-center size-12 rounded-full bg-brand/15 text-brand mb-3">
                  <Check className="size-6" aria-hidden />
                </div>
                <p className="font-display font-semibold text-fg">ההערה נשלחה!</p>
                <p className="text-xs text-fg-muted mt-1">תודה על המשוב.</p>
                <button
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="mt-4 text-sm text-accent hover:text-accent-hover font-medium transition-colors"
                >
                  כתיבת הערה נוספת
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-3">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (status === 'error') setStatus('idle');
                  }}
                  required
                  rows={4}
                  placeholder="מה דעתכם? מה אפשר לשפר?"
                  aria-label="תוכן ההערה"
                  className="w-full rounded-xl bg-bg-elevated border border-border focus:border-accent px-3 py-2.5 text-sm text-fg placeholder:text-fg-dim resize-none transition-colors"
                />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="שם (לא חובה)"
                  aria-label="שם"
                  className="w-full h-10 rounded-xl bg-bg-elevated border border-border focus:border-accent px-3 text-sm text-fg placeholder:text-fg-dim transition-colors"
                />

                {status === 'error' && (
                  <p className="text-xs text-status-danger" role="alert">
                    {NOTES_ENDPOINT
                      ? 'שליחה נכשלה. בדקו את החיבור ונסו שוב.'
                      : 'יעד קבלת ההערות עדיין לא הוגדר.'}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending' || !message.trim()}
                  className="h-11 rounded-xl font-medium bg-accent text-bg-elevated hover:bg-accent-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-2"
                >
                  {status === 'sending' ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      שולח…
                    </>
                  ) : (
                    <>
                      <Send className="size-4" aria-hidden />
                      שליחה
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
