import {
  m4aSegmentsProfile,
  wavContinuousProfile,
  type FormatProfile,
  type FormatProfileId,
} from './formatProfile';

/**
 * Format chosen by D-021. Provisional until the on-device comparison:
 * M4A segments, the fallback the owner set if the trial runs over.
 */
export const M4A_SEGMENT_SECONDS = 2;

export const ACTIVE_PROFILE: FormatProfile = m4aSegmentsProfile(M4A_SEGMENT_SECONDS);

/** Every format a manifest may reference, for recovering older recordings. */
export const PROFILES: Record<FormatProfileId, FormatProfile> = {
  'm4a-segments': m4aSegmentsProfile(M4A_SEGMENT_SECONDS),
  'wav-continuous': wavContinuousProfile(),
};
