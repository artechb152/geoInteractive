import { DemoShell } from '@/components/recap-demos/DemoShell';
import { QuizDemo } from '@/components/recap-demos/QuizDemo';

export const metadata = {
  title: 'דמו · חידון מהיר · סיכום שיעור',
};

export default function QuizPage() {
  return (
    <DemoShell
      id="quiz"
      title="חידון מהיר · הגדרה → מושג"
      tagline="לכל הגדרה — ארבעה מושגים, בחר את הנכון."
      instructions="לחץ על המושג שאתה חושב שמתאים להגדרה. אחרי שתבחר תקבל פידבק מיידי ונעבור לשאלה הבאה."
    >
      <QuizDemo />
    </DemoShell>
  );
}
