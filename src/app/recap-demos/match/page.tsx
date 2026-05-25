import { DemoShell } from '@/components/recap-demos/DemoShell';
import { MatchDemo } from '@/components/recap-demos/MatchDemo';

export const metadata = {
  title: 'דמו · חיבור בקו · סיכום שיעור',
};

export default function MatchPage() {
  return (
    <DemoShell
      id="match"
      title="חיבור בקו · התאמת מושג להגדרה"
      tagline="לכל הגדרה שמשמאל יש מושג שמתאים לה מימין. מתח קו ביניהם."
      instructions="לחץ על מושג ואז על ההגדרה התואמת — קו ייווצר ביניהם. אחרי שכל הזוגות נוצרו, לחץ 'בדוק' כדי לראות מה נכון."
    >
      <MatchDemo />
    </DemoShell>
  );
}
