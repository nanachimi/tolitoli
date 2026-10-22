import {
  checkDiskSpace,
  estimateRecordingBytes,
  LOW_SPACE_WARNING_BYTES,
  MIN_RECORDING_MINUTES,
  remainingRecordingMinutes,
} from '../diskSpace';
import { aacSegmentBytes, m4aSegmentsProfile, wavContinuousProfile } from '../formatProfile';

const MB = 1_000_000;

describe('format profiles', () => {
  it('AAC 64 kbit/s takes 28.8 MB per hour while recording and once final', () => {
    const profile = m4aSegmentsProfile(2);
    expect(profile.recordingBytesPerHour).toBe(28.8 * MB);
    expect(profile.finalBytesPerHour).toBe(28.8 * MB);
    expect(profile.segmentSeconds).toBe(2);
  });

  it('16 kHz mono 16-bit WAV takes 115.2 MB per hour until converted', () => {
    const profile = wavContinuousProfile();
    expect(profile.recordingBytesPerHour).toBe(115.2 * MB);
    expect(profile.finalBytesPerHour).toBe(28.8 * MB);
    expect(profile.segmentSeconds).toBeNull();
  });

  it('derives the rotation threshold from the segment length', () => {
    expect(aacSegmentBytes(2)).toBe(16_000);
    expect(aacSegmentBytes(30)).toBe(240_000);
  });
});

describe.each([
  ['m4a segments', m4aSegmentsProfile(2)],
  ['wav continuous', wavContinuousProfile()],
])('disk space with %s', (_name, profile) => {
  it('estimates one hour from the profile', () => {
    expect(estimateRecordingBytes(profile, 60)).toBe(profile.recordingBytesPerHour);
  });

  it('refuses to start when 10 minutes do not fit', () => {
    const tenMinutes = estimateRecordingBytes(profile, MIN_RECORDING_MINUTES);
    expect(checkDiskSpace(tenMinutes - 1, profile).kind).toBe('insufficient');
    expect(checkDiskSpace(tenMinutes, profile).kind).not.toBe('insufficient');
  });

  it('warns below 500 MB', () => {
    expect(checkDiskSpace(LOW_SPACE_WARNING_BYTES - 1, profile).kind).toBe('low');
    expect(checkDiskSpace(LOW_SPACE_WARNING_BYTES, profile).kind).toBe('ok');
  });

  it('reports remaining minutes at the profile rate', () => {
    expect(remainingRecordingMinutes(profile.recordingBytesPerHour * 2, profile)).toBe(120);
  });
});

it('the WAV profile needs four times the room of M4A segments', () => {
  const free = 15 * MB; // 10 min: 4.8 MB in M4A, 19.2 MB in WAV
  expect(checkDiskSpace(free, m4aSegmentsProfile(2)).kind).toBe('low');
  expect(checkDiskSpace(free, wavContinuousProfile()).kind).toBe('insufficient');
});
