import { recoverAtLaunch } from '../recording/recordingController';
import { getLibrary, openLibrary } from './library';

/**
 * Launch order (docs/plans/step-2.md): database open and migrated, recordings recovered
 * and reconciled, then the trash purge — at launch and nowhere else.
 */
export async function startLibrary(): Promise<void> {
  await openLibrary();
  await recoverAtLaunch();
  const purged = getLibrary().purgeExpiredTrash();
  if (purged.length > 0) console.log('[library] purged', purged.join(', '));
}
