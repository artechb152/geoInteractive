/**
 * SoftDivider — מפריד-מדור רך עם תווית (מקור אמת יחיד).
 * מחליף את ההעתק המקומי הזהה שהיה מוגדר בתחתית כל 12 סצנות ה-Onboarding.
 */
export function SoftDivider({ text }: { text: string }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-sm font-display font-semibold tracking-wider text-fg-muted">
        {text}
      </span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
