import { startLibrary } from '../launch';
import * as library from '../library';

const calls: string[] = [];

jest.mock('../../recording/recordingController', () => ({
  recoverAtLaunch: jest.fn(async () => {
    calls.push('recover');
  }),
}));

describe('startLibrary', () => {
  it('opens the database, recovers recordings, then purges the trash, in that order', async () => {
    const open = jest.spyOn(library, 'openLibrary').mockImplementation(async () => {
      calls.push('open');
      return library.getLibrary();
    });
    const purge = jest.spyOn(library.getLibrary(), 'purgeExpiredTrash').mockImplementation(() => {
      calls.push('purge');
      return [];
    });
    await startLibrary();
    expect(calls).toEqual(['open', 'recover', 'purge']);
    open.mockRestore();
    purge.mockRestore();
  });
});
