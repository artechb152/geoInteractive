'use client';

import { useId, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Mail, Clock, Layers, Sparkles, Loader2 } from 'lucide-react';
import { Reveal } from './Reveal';
import { cn } from '@/lib/utils';
import { lessons } from '@/lib/lessons';

const COUNT = lessons.length;
const easeSnap = [0.22, 1, 0.36, 1] as const;

const TRUST = [
  { Icon: Layers, label: `${COUNT} שיעורים אינטראקטיביים מהיום הראשון` },
  { Icon: Clock, label: 'גישה ללא הגבלת זמן, בקצב שלך' },
  { Icon: Sparkles, label: 'ללא תשלום בגישה המוקדמת' },
];

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function LeadCTA() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const id = useId();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setErrorMsg('כתובת אימייל לא תקינה. נסו שוב.');
      setStatus('error');
      return;
    }
    setErrorMsg(null);
    setStatus('submitting');
    // Simulated network call — in production this would POST to /api/leads
    setTimeout(() => setStatus('success'), 750);
  };

  return (
    <section id="lead" aria-labelledby="lead-title" className="relative py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-brand-dark text-bg-elevated">
            <DecorativeTopo />

            <div className="relative grid lg:grid-cols-[1.1fr_1fr] gap-10 p-7 md:p-10 lg:p-14">
              {/* ── Left: copy ──────────────────────── */}
              <div>
                <span className="inline-flex items-center gap-2.5 text-sm md:text-[15px] font-display font-semibold tracking-wider text-bg-elevated/80 mb-5">
                  <span className="size-2 rounded-full bg-accent animate-pulse" aria-hidden />
                  04 · גישה מוקדמת
                </span>

                <h2
                  id="lead-title"
                  className="font-display font-bold tracking-tight text-balance leading-[1.05] text-[clamp(1.75rem,3.6vw,2.75rem)]"
                >
                  הקדימו את התור.
                  <br className="hidden sm:block" />
                  <span className="text-accent-hover">קבלו גישה ראשונים</span>.
                </h2>

                <p className="mt-4 text-base md:text-lg text-bg-elevated/75 leading-relaxed text-pretty max-w-lg">
                  משתתפי הגישה המוקדמת מקבלים את הקורס ראשונים, ללא תשלום,
                  ומשפיעים על הפיתוח של השיעורים הבאים.
                </p>

                <ul role="list" className="mt-7 grid gap-3">
                  {TRUST.map(({ Icon, label }) => (
                    <li
                      key={label}
                      className="flex items-center gap-3 text-sm md:text-[15px] text-bg-elevated/90"
                    >
                      <Icon className="size-5 shrink-0 text-accent" aria-hidden />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* ── Right: form / success ───────────── */}
              <div className="lg:self-center">
                <AnimatePresence mode="wait">
                  {status !== 'success' ? (
                    <motion.form
                      key="form"
                      onSubmit={submit}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: easeSnap }}
                      className="rounded-2xl bg-bg-elevated p-5 md:p-6 text-fg"
                      noValidate
                    >
                      <label
                        htmlFor={`${id}-email`}
                        className="block font-display font-semibold text-fg"
                      >
                        כתובת אימייל
                      </label>
                      <p className="mt-1 text-sm text-fg-muted">
                        נשלח אליך מייל הפעלה תוך כמה דקות.
                      </p>

                      <div className="relative mt-4">
                        <Mail
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-fg-dim pointer-events-none"
                          aria-hidden
                        />
                        <input
                          id={`${id}-email`}
                          type="email"
                          dir="ltr"
                          inputMode="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (status === 'error') {
                              setStatus('idle');
                              setErrorMsg(null);
                            }
                          }}
                          disabled={status === 'submitting'}
                          placeholder="name@example.com"
                          aria-invalid={status === 'error'}
                          aria-describedby={status === 'error' ? `${id}-error` : undefined}
                          className={cn(
                            'w-full pr-10 pl-3 py-3 rounded-lg text-[15px] bg-bg border text-fg placeholder:text-fg-dim',
                            'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand',
                            'transition-colors',
                            'disabled:opacity-60',
                            status === 'error' ? 'border-accent-hover' : 'border-border',
                          )}
                        />
                      </div>

                      <div className="min-h-[1.25rem] mt-2">
                        {status === 'error' && errorMsg && (
                          <p
                            id={`${id}-error`}
                            role="alert"
                            className="text-xs text-accent"
                          >
                            {errorMsg}
                          </p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={status === 'submitting'}
                        className={cn(
                          'group mt-3 inline-flex w-full items-center justify-center gap-2 px-5 py-3 rounded-lg font-medium',
                          'text-bg-elevated bg-accent hover:bg-accent-hover',
                          'disabled:opacity-60 disabled:cursor-not-allowed',
                          'transition-all',
                        )}
                      >
                        {status === 'submitting' ? (
                          <>
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                            <span>שולח...</span>
                          </>
                        ) : (
                          <span>הצטרפו לגישה המוקדמת</span>
                        )}
                      </button>

                      <p className="mt-3 text-xs text-fg-dim text-center">
                        לא נשלח אליך ספאם. אפשר להסיר בכל זמן.
                      </p>
                    </motion.form>
                  ) : (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, y: 12, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.45, ease: easeSnap }}
                      role="status"
                      aria-live="polite"
                      className="rounded-2xl bg-bg-elevated p-7 md:p-8 text-fg text-center"
                    >
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.45, ease: easeSnap, delay: 0.1 }}
                        className="grid place-items-center size-14 mx-auto mb-4 rounded-full bg-accent/15 text-accent border-2 border-accent/30"
                      >
                        <Check className="size-7" strokeWidth={2.5} aria-hidden />
                      </motion.div>
                      <h3 className="font-display font-bold text-xl text-fg">אתם בפנים!</h3>
                      <p className="mt-2 text-sm md:text-[15px] text-fg-muted leading-relaxed">
                        שלחנו מייל הפעלה אל
                        <br />
                        <strong dir="ltr" className="inline-block text-fg font-mono mt-1">
                          {email}
                        </strong>
                      </p>
                      <p className="mt-3 text-xs text-fg-dim">
                        לא רואים אותו? בדקו בקידום מכירות / ספאם.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function DecorativeTopo() {
  // Subtle topographic contour pattern fading from the right edge — visual rhythm
  // with the Hero diorama, very low opacity so it never competes with the form.
  return (
    <svg
      aria-hidden
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full opacity-20"
    >
      <defs>
        <linearGradient id="lead-topo" x1="0" x2="1" y1="0.5" y2="0.5">
          <stop offset="0%" stopColor="#FFFBF7" stopOpacity="0" />
          <stop offset="60%" stopColor="#FFFBF7" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#EB9E48" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      {Array.from({ length: 10 }).map((_, i) => {
        const yBase = 470 - i * 35;
        return (
          <path
            key={i}
            d={`M -40 ${yBase} C 120 ${yBase - 50 - i * 8}, 280 ${yBase + 10}, 440 ${yBase - 30 - i * 6} S 720 ${yBase + 20 - i * 4}, 840 ${yBase - i * 6}`}
            fill="none"
            stroke="url(#lead-topo)"
            strokeWidth={0.8 + i * 0.15}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
