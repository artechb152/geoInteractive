'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Project-styled Radix Accordion primitives.
 *
 * Visual language matches the OnboardingScene pattern across lessons.
 * The component is intentionally unopinionated about active/passed
 * styling — callers pass those classes through `className` on
 * `AccordionItem`. Radix's `data-state` only drives the chevron
 * rotation. That keeps decoupled the two semantic states the lessons
 * need: which panel is *open* (Radix) vs. which step is *active*
 * (drives the right-side visualization, owned by the lesson).
 */

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn('surface overflow-hidden transition-colors', className)}
    {...props}
  />
));
AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'w-full p-3 text-right flex items-center gap-3 relative',
        '[&[data-state=open]>svg.chev]:rotate-180 [&[data-state=open]>svg.chev]:text-brand-dark',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown
        className="chev size-[18px] shrink-0 text-fg-dim transition-transform duration-200"
        aria-hidden
      />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn('px-3 pb-3 pt-1 border-t border-brand/20', className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
