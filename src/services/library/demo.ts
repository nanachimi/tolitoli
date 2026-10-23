import type { LibraryItem, Segment } from './types';

/**
 * Development demo set (step 1c): fictional recordings covering every state the
 * interface must show (cahier, « États à concevoir »). Kept in memory only, never
 * written, and only reachable from a development switch.
 */

const MINUTE = 60_000;

function at(now: Date, daysAgo: number, hours: number, minutes: number): string {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysAgo,
    hours,
    minutes,
  ).toISOString();
}

export function demoItems(now: Date): LibraryItem[] {
  const base = { recovered: false, demo: true } as const;
  return [
    {
      ...base,
      id: 'demo-meeting',
      title: 'Réunion fournisseur',
      createdAt: at(now, 0, 14, 2),
      durationMs: 42 * MINUTE,
      state: 'transcribed',
      language: 'sw',
      quality: 'draft',
    },
    {
      ...base,
      id: 'demo-transcribing',
      title: null,
      createdAt: at(now, 0, 9, 31),
      durationMs: 72 * MINUTE,
      state: 'transcribing',
      language: 'fr',
      quality: 'good',
      progress: 0.35,
    },
    {
      ...base,
      id: 'demo-lecture',
      title: 'Cours de linguistique',
      createdAt: at(now, 1, 10, 15),
      durationMs: 55 * MINUTE,
      state: 'transcribed',
      language: 'fr',
      quality: 'good',
    },
    {
      ...base,
      id: 'demo-recovered',
      title: null,
      createdAt: at(now, 1, 18, 40),
      durationMs: 8 * MINUTE,
      state: 'audio',
      language: null,
      quality: null,
      recovered: true,
    },
    {
      ...base,
      id: 'demo-kinshasa',
      title: 'Entretien à Kinshasa',
      createdAt: at(now, 3, 16, 20),
      durationMs: 23 * MINUTE,
      state: 'transcribed',
      language: 'ln',
      quality: 'medium',
    },
    {
      ...base,
      id: 'demo-market',
      title: 'Marché Sandaga',
      createdAt: at(now, 4, 11, 5),
      durationMs: 12 * MINUTE,
      state: 'audio',
      language: 'wo',
      quality: null,
      issue: 'quota-exhausted',
    },
    {
      ...base,
      id: 'demo-failed',
      title: null,
      createdAt: at(now, 5, 15, 45),
      durationMs: 31 * MINUTE,
      state: 'failed',
      language: 'fr',
      quality: 'good',
      issue: 'failed',
    },
    {
      ...base,
      id: 'demo-tunis',
      title: 'Point budget à Tunis',
      createdAt: at(now, 3, 11, 0),
      durationMs: 14 * MINUTE,
      state: 'transcribed',
      language: 'ar',
      quality: 'good',
    },
    {
      ...base,
      id: 'demo-offline',
      title: 'Assemblée de quartier',
      createdAt: at(now, 2, 18, 30),
      durationMs: 9 * MINUTE,
      state: 'audio',
      language: 'ig',
      quality: null,
      issue: 'offline',
    },
    {
      ...base,
      id: 'demo-workshop',
      title: 'Atelier d’écriture',
      createdAt: at(now, 6, 9, 0),
      durationMs: 18 * MINUTE,
      state: 'audio',
      language: 'en',
      quality: 'good',
      issue: 'model-missing',
    },
  ];
}

type Line = [speaker: number, seconds: number, text: string];

const LINES: Record<string, Line[]> = {
  'demo-meeting': [
    [1, 0, 'Habari za asubuhi, tuanze na ratiba ya wiki hii.'],
    [2, 9, 'Sawa, but the delivery schedule needs to move to Friday.'],
    [1, 17, 'Friday ni sawa, lakini tutahitaji confirmation kwa maandishi.'],
    [2, 26, 'I will send the email today, kabla ya saa kumi.'],
    [1, 35, 'Asante. Tunaweza kuanza na bei ya usafiri kwanza.'],
    [2, 44, 'The transport price went up by ten percent since August.'],
  ],
  'demo-lecture': [
    [1, 0, 'Bonjour à tous. Aujourd’hui, on commence par les pluriels russes, puis le wolof.'],
    [1, 12, 'En russe, la forme du nom dépend du nombre qui le précède.'],
    [2, 24, 'Et pour vingt et un, c’est la même forme que pour un ?'],
    [1, 31, 'Exactement : vingt et un se comporte comme un, vingt-deux comme deux.'],
    [1, 45, 'Le wolof, lui, ne marque presque jamais le pluriel sur le nom.'],
  ],
  // Arabic and French in one conversation: each segment is aligned on its own script.
  'demo-tunis': [
    [1, 0, 'صباح الخير، on commence la séance ?'],
    [2, 6, 'Oui, on commence. عندي سؤال على الميزانية.'],
    [1, 14, 'الميزانية جاهزة، je vous envoie le fichier ce soir.'],
    [2, 22, 'Parfait, merci. نتلاقاو غدوة.'],
  ],
  'demo-kinshasa': [
    [1, 0, 'Mbote na bino, tokobanda na likambo ya liboso.'],
    [2, 8, 'Merci, oyo ezali mpo na projet ya mai ya komela.'],
    [1, 16, 'Tosengeli kosilisa mosala yango liboso ya sanza ya zomi na moko.'],
    [2, 27, 'Ya solo, kasi mbongo ekoki te mpo na bapompi nyonso.'],
  ],
};

export function demoSegments(id: string): Segment[] {
  const lines = LINES[id] ?? [];
  return lines.map(([speaker, seconds, text], index) => ({
    id: `${id}-${index}`,
    speaker,
    startMs: seconds * 1000,
    endMs: (lines[index + 1]?.[1] ?? seconds + 9) * 1000,
    text,
  }));
}
