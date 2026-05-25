import { DemoShell } from '@/components/recap-demos/DemoShell';
import { SortDemo } from '@/components/recap-demos/SortDemo';

export const metadata = {
  title: 'דמו · סידור לקטגוריות · סיכום שיעור',
};

export default function SortPage() {
  return (
    <DemoShell
      id="sort"
      title="סידור לקטגוריות · מה שייך לאן"
      tagline="כל מושג שייך לאחת משלוש קבוצות: רמות מלחמה · MDO ועליונות · לחימה אסימטרית."
      instructions="לחץ על מושג כדי להרים אותו, ואז לחץ על הקטגוריה אליה הוא שייך. אפשר להעביר בין קטגוריות עד שלוחצים 'בדוק'."
    >
      <SortDemo />
    </DemoShell>
  );
}
