import { DemoShell } from '@/components/recap-demos/DemoShell';
import { FlashcardsDemo } from '@/components/recap-demos/FlashcardsDemo';

export const metadata = {
  title: 'דמו · כרטיסי זיכרון · סיכום שיעור',
};

export default function FlashcardsPage() {
  return (
    <DemoShell
      id="flashcards"
      title="כרטיסי זיכרון · אקטיב-ריקול"
      tagline="הכרטיס מראה מושג. נסה להיזכר בהגדרה לפני שהופך."
      instructions="לחץ על הכרטיס כדי לראות את ההגדרה. אחרי שהפכת, סמן 'ידעתי' או 'צריך לחזור' — מה שדורש חזרה יחזור בסוף התור."
    >
      <FlashcardsDemo />
    </DemoShell>
  );
}
