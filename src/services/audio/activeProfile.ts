import {
  m4aSegmentsProfile,
  wavContinuousProfile,
  type FormatProfile,
  type FormatProfileId,
} from './formatProfile';

/** Segment length of the M4A variant measured by D-021 (not the active format). */
export const M4A_SEGMENT_SECONDS = 2;

/**
 * Format chosen by D-021: continuous WAV, flushed every 200 ms, converted to
 * `.m4a` once at stop. The M4A segments left gaps at every junction once joined.
 */
export const ACTIVE_PROFILE: FormatProfile = wavContinuousProfile();

/** Every format a manifest may reference, for recovering older recordings. */
export const PROFILES: Record<FormatProfileId, FormatProfile> = {
  'm4a-segments': m4aSegmentsProfile(M4A_SEGMENT_SECONDS),
  'wav-continuous': wavContinuousProfile(),
};
