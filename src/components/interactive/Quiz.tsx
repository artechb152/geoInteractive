'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export type Question = {
  id: string;
  stem: string;
  options: { id: string; label: string }[];
  correctId: string;
  rationale: string;
  feedback?: Record<string, string>;
  objective?: string;
};

export function Quiz({ questions }: { questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = submitted
    ? questions.filter((q) => answers[q.id] === q.correctId).length
    : 0;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-bold">בדיקת ידע</h2>
        <p className="text-fg-muted text-sm">
          {questions.length} שאלות · בחר תשובה אחת לכל שאלה
        </p>
      </header>

      <ol className="space-y-5">
        {questions.map((q, i) => {
          const picked = answers[q.id];
          const isCorrect = picked === q.correctId;
          return (
            <li key={q.id} className="surface p-5">
              <div className="flex gap-3 mb-4">
                <span className="size-7 rounded-lg bg-bg-accent text-fg-muted font-mono text-sm flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <p className="font-medium leading-relaxed">{q.stem}</p>
              </div>

              <div className="space-y-2">
                {q.options.map((o) => {
                  const isPicked = picked === o.id;
                  const isAnswer = o.id === q.correctId;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={submitted}
                      onClick={() =>
                        setAnswers((a) => ({ ...a, [q.id]: o.id }))
                      }
                      className={cn(
                        'w-full text-right px-4 py-3 rounded-xl border transition-all text-sm',
                        !submitted && isPicked && 'border-accent bg-accent/10',
                        !submitted && !isPicked && 'border-border hover:border-border-strong',
                        submitted && isAnswer && 'border-status-ok bg-status-ok/10 text-status-ok',
                        submitted && isPicked && !isAnswer && 'border-status-danger bg-status-danger/10 text-status-danger',
                        submitted && !isPicked && !isAnswer && 'border-border-subtle opacity-50'
                      )}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div
                  className={cn(
                    'mt-4 p-3 rounded-xl text-sm border',
                    isCorrect
                      ? 'border-status-ok/40 bg-status-ok/5 text-status-ok'
                      : 'border-status-warn/40 bg-status-warn/5 text-status-warn'
                  )}
                >
                  <strong className="font-semibold me-2">
                    {isCorrect ? '✓ נכון.' : '✗ לא נכון.'}
                  </strong>
                  <span className="text-fg-muted">{q.rationale}</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex items-center justify-between">
        {submitted ? (
          <>
            <div className="text-lg">
              ציון:{' '}
              <strong className="font-mono text-accent">
                {score}/{questions.length}
              </strong>
            </div>
            <button
              className="btn-ghost"
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
              }}
            >
              ניסיון נוסף
            </button>
          </>
        ) : (
          <button
            className="btn-primary"
            disabled={Object.keys(answers).length !== questions.length}
            onClick={() => setSubmitted(true)}
          >
            שליחת תשובות
          </button>
        )}
      </div>
    </div>
  );
}
