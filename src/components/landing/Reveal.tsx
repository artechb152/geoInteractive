'use client';

import { motion, useReducedMotion, type MotionProps } from 'framer-motion';
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

type RevealProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'children' | 'className'> &
  Omit<MotionProps, 'children'>;

export function Reveal<T extends ElementType = 'div'>({
  as,
  children,
  delay = 0,
  y = 24,
  className,
  ...rest
}: RevealProps<T>) {
  const reduce = useReducedMotion();
  const Tag = (motion[(as as keyof typeof motion) ?? 'div'] ?? motion.div) as typeof motion.div;

  return (
    <Tag
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export const stagger = {
  container: {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  },
  item: {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  },
};
