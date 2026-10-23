import { testDatabase } from '../../../db/__tests__/testDatabase';
import { MemoryFs } from '../../audio/__tests__/fakes';
import { SqliteLibraryRepository } from '../sqlite';

/**
 * Search cost on a heavy user's library (owner, step 2): 200 one-hour recordings,
 * one segment every 7 s, about 100 000 segments. Run on demand, not in CI:
 *   TOLITOLI_BENCH=1 npx jest src/services/library/__tests__/search.bench
 */
const run = process.env.TOLITOLI_BENCH === '1' ? describe : describe.skip;

const RECORDINGS = 200;
const SEGMENTS_PER_RECORDING = Math.round(3_600_000 / 7_000);

const FRENCH = [
  'On reprend le point budget avant la fin de la réunion.',
  'Le fournisseur propose une livraison vendredi matin.',
  'Il faudra relire le contrat avec le juriste la semaine prochaine.',
  'Les chiffres du trimestre sont meilleurs que prévu.',
];
const CHINESE = [
  '今天我们开会讨论预算和下个月的计划。',
  '供应商说星期五早上可以送货。',
  '这个季度的数字比预期的好。',
];

function lineFor(recording: number, index: number): string {
  // One recording in five is in Chinese, the rest in French.
  const pool = recording % 5 === 0 ? CHINESE : FRENCH;
  return `${pool[(recording + index) % pool.length]} ${recording}-${index}`;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function time(search: () => unknown, runs = 7): number {
  search(); // warm the page cache
  const samples: number[] = [];
  for (let i = 0; i < runs; i += 1) {
    const start = process.hrtime.bigint();
    search();
    samples.push(Number(process.hrtime.bigint() - start) / 1e6);
  }
  return median(samples);
}

run('search on a heavy library', () => {
  it('measures the LIKE fallback for Chinese against the FTS query', () => {
    const { db, client } = testDatabase();
    const repository = new SqliteLibraryRepository({
      db,
      fs: new MemoryFs(),
      root: 'r',
      now: () => new Date(),
    });
    const fill = process.hrtime.bigint();
    for (let r = 0; r < RECORDINGS; r += 1) {
      const id = `rec-${r}`;
      repository.createRecording({ id, createdAt: new Date(2026, 0, 1, 0, r).toISOString() });
      repository.finalizeRecording(id, {
        audioPath: `${id}.m4a`,
        audioSize: 29_000_000,
        audioFormat: 'm4a',
        durationMs: 3_600_000,
        recovered: false,
      });
      repository.queueTranscription(id, {
        language: r % 5 === 0 ? 'zh' : 'fr',
        engine: 'local',
        model: null,
      });
      repository.startTranscription(id);
      repository.saveTranscript(
        id,
        Array.from({ length: SEGMENTS_PER_RECORDING }, (_, index) => ({
          startMs: index * 7_000,
          endMs: index * 7_000 + 6_500,
          speaker: (index % 2) + 1,
          text: lineFor(r, index),
        })),
        { quality: 'good' },
      );
    }
    const fillMs = Number(process.hrtime.bigint() - fill) / 1e6;
    const segments = (client.prepare('select count(*) as n from segments').get() as { n: number })
      .n;

    const likeMid = time(() => repository.search('讨论'));
    const likeRare = time(() => repository.search('送货'));
    const fts = time(() => repository.search('fournisseur'));
    const ftsPrefix = time(() => repository.search('budg'));

    console.log(
      [
        `segments: ${segments} (${RECORDINGS} recordings × ${SEGMENTS_PER_RECORDING})`,
        `fill: ${fillMs.toFixed(0)} ms`,
        `LIKE 讨论 (Chinese, mid-sentence): ${likeMid.toFixed(1)} ms, ${repository.search('讨论').length} recordings`,
        `LIKE 送货: ${likeRare.toFixed(1)} ms`,
        `FTS fournisseur: ${fts.toFixed(1)} ms, ${repository.search('fournisseur').length} recordings`,
        `FTS prefix budg: ${ftsPrefix.toFixed(1)} ms`,
      ].join('\n'),
    );
    expect(repository.search('讨论')).toHaveLength(RECORDINGS / 5);
  });
});
