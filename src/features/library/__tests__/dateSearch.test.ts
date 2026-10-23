import { openTestLibrary } from '../../../db/__tests__/testLibrary';
import { settingsStorage as Storage } from '@/features/settings/storage';
import { i18next, initI18n } from '@/i18n';

import { keepTitleIndexInLanguage, TITLES_LANGUAGE_STORAGE_KEY } from '../launch';
import * as library from '../library';

jest.mock('../../recording/recordingController', () => ({ recoverAtLaunch: jest.fn() }));

initI18n();

/** 23 October 2026, 15:45, local time: what the Library shows as « 23 oct. 15:45 ». */
const CREATED = new Date(2026, 9, 23, 15, 45);

function withRecordings() {
  const repository = openTestLibrary('real');
  const add = (id: string) => {
    repository.createRecording({ id, createdAt: CREATED.toISOString() });
    repository.finalizeRecording(id, {
      audioPath: `${id}.m4a`,
      audioSize: 1,
      audioFormat: 'm4a',
      durationMs: 32_000,
      recovered: false,
    });
  };
  add('untitled');
  add('titled');
  repository.rename('titled', 'Point budget');
  // An older one, which no date word of 23 October may find.
  repository.createRecording({ id: 'other', createdAt: new Date(2025, 2, 4, 9, 5).toISOString() });
  return repository;
}

/** Plus the day before at 10:23, which « 23 oct » used to find through the minutes of its time. */
function withEve() {
  const repository = withRecordings();
  repository.createRecording({ id: 'eve', createdAt: new Date(2026, 9, 22, 10, 23).toISOString() });
  return repository;
}

const ids = (items: { id: string }[]) => items.map((item) => item.id).sort();

afterEach(async () => {
  await i18next.changeLanguage('fr');
});

describe('search by what the Library shows, in French', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('fr');
  });

  it.each([
    ['23 oct', ['titled', 'untitled']],
    ['octobre', ['titled', 'untitled']],
    ['oct.', ['titled', 'untitled']],
    ['23/10', ['titled', 'untitled']],
    ['23/10/2026', ['titled', 'untitled']],
    ['2026', ['titled', 'untitled']],
    ['15:45', ['titled', 'untitled']],
    ['Enregistrement du 23 oct', ['untitled']],
    ['point budget', ['titled']],
    ['mars 2025', ['other']],
  ])('« %s »', (query, expected) => {
    expect(ids(withRecordings().search(query))).toEqual(expected);
  });

  it('finds nothing for another date', () => {
    expect(withRecordings().search('24 oct')).toEqual([]);
  });

  it.each([
    ['10:23', ['eve']],
    ['22/10', ['eve']],
    ['22/10/2026', ['eve']],
    // A time and a numeric date are one word each in the title index (migration 0002).
    ['23 oct', ['titled', 'untitled']],
    ['23', ['titled', 'untitled']],
  ])('« %s », with a recording of 22 October at 10:23', (query, expected) => {
    expect(ids(withEve().search(query))).toEqual(expected);
  });

  it('keeps one index row per recording after a rename', () => {
    const repository = withRecordings();
    repository.rename('titled', 'Autre titre');
    repository.rename('titled', 'Encore un');
    expect(ids(repository.search('2026'))).toEqual(['titled', 'untitled']);
    expect(ids(repository.search('budget'))).toEqual([]);
    expect(ids(repository.search('encore'))).toEqual(['titled']);
  });
});

describe('search by what the Library shows, in Arabic', () => {
  it.each([
    ['أكتوبر', ['titled', 'untitled']],
    ['23 أكتوبر', ['titled', 'untitled']],
    ['٢٣/١٠', ['titled', 'untitled']],
    ['23/10', ['titled', 'untitled']],
    ['٢٠٢٦', ['titled', 'untitled']],
    ['2026', ['titled', 'untitled']],
    // Every recording without a typed title is called « تسجيل … ».
    ['تسجيل', ['other', 'untitled']],
  ])('« %s »', async (query, expected) => {
    await i18next.changeLanguage('ar');
    const repository = withRecordings();
    expect(ids(repository.search(query))).toEqual(expected);
  });

  it.each([
    ['١٠:٢٣', ['eve']],
    ['٢٢/١٠', ['eve']],
    ['٢٣ أكتوبر', ['titled', 'untitled']],
  ])('« %s », with a recording of 22 October at 10:23', async (query, expected) => {
    await i18next.changeLanguage('ar');
    expect(ids(withEve().search(query))).toEqual(expected);
  });
});

describe('the title index follows the interface language', () => {
  it('rebuilds when the language changes, so the old month names no longer match', async () => {
    await i18next.changeLanguage('fr');
    const repository = withRecordings();
    jest.spyOn(library, 'getLibrary').mockReturnValue(repository);
    keepTitleIndexInLanguage();
    expect(ids(repository.search('octobre'))).toEqual(['titled', 'untitled']);
    await i18next.changeLanguage('ar');
    expect(ids(repository.search('أكتوبر'))).toEqual(['titled', 'untitled']);
    expect(repository.search('octobre')).toEqual([]);
    expect(Storage.getItemSync(TITLES_LANGUAGE_STORAGE_KEY)).toBe('ar');
    jest.restoreAllMocks();
  });

  it('rebuilds at launch when the index lacks rows, even in the right language', async () => {
    await i18next.changeLanguage('fr');
    const repository = withRecordings();
    Storage.setItemSync(TITLES_LANGUAGE_STORAGE_KEY, 'fr');
    jest.spyOn(library, 'getLibrary').mockReturnValue(repository);
    // What the A05 showed after development reloads: key set, index empty.
    repository.reindexTitles();
    expect(repository.titleIndexIsComplete()).toBe(true);
    const reindex = jest.spyOn(repository, 'reindexTitles');
    keepTitleIndexInLanguage();
    expect(reindex).not.toHaveBeenCalled();
    jest.spyOn(repository, 'titleIndexIsComplete').mockReturnValue(false);
    keepTitleIndexInLanguage();
    expect(reindex).toHaveBeenCalledTimes(1);
    jest.restoreAllMocks();
  });

  it('rebuilds at launch when the index was built in another language', async () => {
    await i18next.changeLanguage('fr');
    const repository = withRecordings();
    Storage.setItemSync(TITLES_LANGUAGE_STORAGE_KEY, 'ar');
    const reindex = jest.spyOn(repository, 'reindexTitles');
    jest.spyOn(library, 'getLibrary').mockReturnValue(repository);
    keepTitleIndexInLanguage();
    expect(reindex).toHaveBeenCalledTimes(1);
    keepTitleIndexInLanguage();
    expect(reindex).toHaveBeenCalledTimes(1);
    jest.restoreAllMocks();
  });
});
