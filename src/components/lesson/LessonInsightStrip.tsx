'use client';

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

/**
 * LessonInsightStrip — רצועת "השורה התחתונה" הסוגרת סצנת הוראה:
 * כרטיס לבן שטוח, אייקון, eyebrow כתום (ember = הדגשת פעולה/מסקנה)
 * ופרוזה בדיו זית. מאחד את ה-motion.div המשוכפל בסוף הסצנות.
 */
export function LessonInsightStrip({
  eyebrow,
  icon = 'spark',
  elevated = false,
  className,
  children,
}: {
  eyebrow: React.ReactNode;
  icon?: IconName;
  /** צל card-soft — כשהרצועה צריכה לבלוט מהקרם ולא לשבת על כרטיס */
  elevated?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className={cn(
        elevated ? 'surface-elevated' : 'surface',
        'flex items-start gap-4 p-6',
        className,
      )}
    >
      <Icon name={icon} size={22} className="mt-0.5 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-sm font-display font-semibold tracking-wider text-accent">
          {eyebrow}
        </div>
        <div className="text-fg leading-relaxed text-pretty">{children}</div>
      </div>
    </motion.div>
  );
}
