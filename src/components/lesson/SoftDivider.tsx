/**
 * SoftDivider — מפריד-מדור רך עם תווית (מקור אמת יחיד).
 * מחליף את ההעתק המקומי הזהה שהיה מוגדר בתחתית כל 12 סצנות ה-Onboarding.
 */
export function SoftDivider({ text }: { text: string }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-base font-display font-bold text-black tracking-wider">
        {text}
      </span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
