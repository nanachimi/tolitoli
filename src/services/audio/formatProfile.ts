/**
 * Recording formats compared by D-021. Bitrates and segment lengths come only
 * from here so disk estimates follow the chosen variant.
 */
export type FormatProfileId = 'm4a-segments' | 'wav-continuous';

export type FormatProfile = {
  id: FormatProfileId;
  /** Extension of the files written while recording. */
  extension: 'm4a' | 'wav';
  sampleRate: number;
  channels: 1;
  /** AAC bitrate; null for uncompressed PCM. */
  bitRate: number | null;
  /** Target segment length; null when a single file grows for the whole session. */
  segmentSeconds: number | null;
  /** Disk use while recording, before any conversion. */
  recordingBytesPerHour: number;
  /** Disk use of the final `.m4a`. */
  finalBytesPerHour: number;
};

const SECONDS_PER_HOUR = 3600;
const AAC_BIT_RATE = 64_000;
const PCM_BYTES_PER_SAMPLE = 2;

export function aacBytesPerHour(bitRate: number): number {
  return (bitRate / 8) * SECONDS_PER_HOUR;
}

export function pcmBytesPerHour(sampleRate: number, channels: number): number {
  return sampleRate * channels * PCM_BYTES_PER_SAMPLE * SECONDS_PER_HOUR;
}

/** Bytes an AAC segment of `seconds` takes, used as the engine's rotation threshold. */
export function aacSegmentBytes(seconds: number, bitRate = AAC_BIT_RATE): number {
  return Math.round((bitRate / 8) * seconds);
}

export function m4aSegmentsProfile(segmentSeconds: number): FormatProfile {
  return {
    id: 'm4a-segments',
    extension: 'm4a',
    sampleRate: 44_100,
    channels: 1,
    bitRate: AAC_BIT_RATE,
    segmentSeconds,
    recordingBytesPerHour: aacBytesPerHour(AAC_BIT_RATE),
    finalBytesPerHour: aacBytesPerHour(AAC_BIT_RATE),
  };
}

export function wavContinuousProfile(): FormatProfile {
  return {
    id: 'wav-continuous',
    extension: 'wav',
    sampleRate: 16_000,
    channels: 1,
    bitRate: null,
    segmentSeconds: null,
    recordingBytesPerHour: pcmBytesPerHour(16_000, 1),
    finalBytesPerHour: aacBytesPerHour(AAC_BIT_RATE),
  };
}
