import { notFound } from 'next/navigation';
import { lessons, getLesson, nextLesson, prevLesson } from '@/lib/lessons';
import { loadTopicContent } from '@/lib/content';
import { quizzes } from '@/lib/quizzes';
import { LessonShell } from '@/components/lesson/LessonShell';
import { LessonContent } from '@/components/lesson/LessonContent';
import { Quiz } from '@/components/interactive/Quiz';
import { InteractionPlaceholder } from '@/components/interactive/InteractionPlaceholder';
import { Topic01Lesson } from '@/components/lessons/topic-01/Topic01Lesson';
import { Topic02Lesson } from '@/components/lessons/topic-02/Topic02Lesson';
import { Topic03Lesson } from '@/components/lessons/topic-03/Topic03Lesson';

// PREVIEW BUILD — only lessons 1-3 are wired up. To restore the full
// course, re-add the Topic04Lesson…Topic12Lesson imports and registry
// entries (they still exist in `src/components/lessons/topic-04..12`).
const customLearn: Record<string, () => React.ReactNode> = {
  'topic-01': () => <Topic01Lesson />,
  'topic-02': () => <Topic02Lesson />,
  'topic-03': () => <Topic03Lesson />,
};

export function generateStaticParams() {
  return lessons.map((l) => ({ topicId: l.id }));
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const lesson = getLesson(topicId);
  if (!lesson) notFound();

  const raw = loadTopicContent(topicId);
  const prev = prevLesson(topicId);
  const next = nextLesson(topicId);
  const questions = quizzes[topicId] ?? [];

  const learn = customLearn[topicId]
    ? customLearn[topicId]()
    : <LessonContent raw={raw} lesson={lesson} />;

  return (
    <LessonShell
      lesson={lesson}
      prev={prev && { id: prev.id, shortTitle: prev.shortTitle }}
      next={next && { id: next.id, shortTitle: next.shortTitle }}
      learn={learn}
      practice={<InteractionPlaceholder kind={lesson.interactions[0]} />}
      check={
        questions.length > 0 ? (
          <Quiz questions={questions} />
        ) : (
          <p className="text-fg-muted">שאלות בדיקת ידע יתווספו לשיעור זה.</p>
        )
      }
    />
  );
}
