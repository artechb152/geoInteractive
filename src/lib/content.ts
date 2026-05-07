import fs from 'node:fs';
import path from 'node:path';

const CONTENT_DIR = path.join(process.cwd(), 'content');

export function loadTopicContent(topicId: string): string {
  const file = path.join(CONTENT_DIR, `${topicId}.md`);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8');
}

export function parseTopic(raw: string) {
  const lines = raw.split(/\r?\n/);
  const sections: { heading: string; level: number; body: string[] }[] = [];
  let current: { heading: string; level: number; body: string[] } | null = null;

  for (const line of lines) {
    const matchTopic = line.match(/^נושא\s+\d+:\s*$/);
    const matchSub = line.match(/^תת[־\s-]?נושא\s+(\d+\.\d+):?\s*(.*)$/);

    if (matchTopic) continue;

    if (matchSub) {
      if (current) sections.push(current);
      current = { heading: matchSub[2] || matchSub[1], level: 2, body: [] };
      continue;
    }

    if (!current) {
      current = { heading: '', level: 1, body: [] };
    }
    current.body.push(line);
  }
  if (current) sections.push(current);
  return sections.filter((s) => s.body.join('').trim().length > 0);
}
