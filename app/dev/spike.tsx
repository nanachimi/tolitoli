/* eslint-disable i18next/no-literal-string -- throwaway D-021 test bench, deleted before the step-1 PR */
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AudioManager,
  AudioRecorder,
  BitDepth,
  FileDirectory,
  FileFormat,
  FlacCompressionLevel,
  IOSAudioQuality,
  concatAudioFiles,
  getAudioDuration,
} from 'react-native-audio-api';

type Variant = { key: string; format: FileFormat; sampleRate: number; rotateBytes: number };

// AAC 64 kbit/s ≈ 8000 bytes/s, so 16 000 bytes ≈ 2 s and 240 000 bytes ≈ 30 s.
const VARIANTS: Variant[] = [
  { key: 'm4a-2s', format: FileFormat.M4A, sampleRate: 44100, rotateBytes: 16_000 },
  { key: 'm4a-30s', format: FileFormat.M4A, sampleRate: 44100, rotateBytes: 240_000 },
  { key: 'wav-16k', format: FileFormat.Wav, sampleRate: 16000, rotateBytes: 0 },
];

const ROOT = new Directory(Paths.document, 'spike');

function log(...args: unknown[]) {
  console.log('[spike]', ...args);
}

// Event-handler clock, kept out of the component body for the React Compiler purity rule.
function now(): number {
  return Date.now();
}

function listRuns(): { name: string; files: { name: string; size: number }[] }[] {
  if (!ROOT.exists) return [];
  return ROOT.list()
    .filter((entry): entry is Directory => entry instanceof Directory)
    .map((dir) => ({
      name: dir.name,
      files: dir
        .list()
        .filter((entry): entry is File => entry instanceof File)
        .map((file) => ({ name: file.name, size: file.size }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => b.name.localeCompare(a.name));
}

/** Rewrites RIFF and data chunk sizes from the real file size (header left stale by a kill). */
function repairWav(file: File): string {
  const handle = file.open(FileMode.ReadWrite);
  try {
    const header = handle.readBytesSync(4096);
    const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
    const tag = (offset: number) => String.fromCharCode(...header.subarray(offset, offset + 4));
    if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return 'not a WAV file';
    let offset = 12;
    while (offset + 8 <= header.byteLength) {
      const id = tag(offset);
      const size = view.getUint32(offset + 4, true);
      if (id === 'data') {
        const total = file.size;
        const dataSize = total - (offset + 8);
        const patch = new Uint8Array(4);
        const patchView = new DataView(patch.buffer);
        patchView.setUint32(0, total - 8, true);
        handle.offset = 4;
        handle.writeBytesSync(patch);
        patchView.setUint32(0, dataSize, true);
        handle.offset = offset + 4;
        handle.writeBytesSync(patch);
        return `repaired: data ${size} -> ${dataSize} bytes`;
      }
      offset += 8 + size + (size % 2);
    }
    return 'no data chunk';
  } finally {
    handle.close();
  }
}

export default function SpikeScreen() {
  const recorder = useRef<AudioRecorder | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [status, setStatus] = useState('idle');
  const [runs, setRuns] = useState(listRuns());

  const refresh = useCallback(() => setRuns(listRuns()), []);

  useEffect(() => {
    void AudioManager.requestRecordingPermissions().then((p) => log('mic permission', p));
    AudioManager.setAudioSessionOptions({ iosCategory: 'playAndRecord', iosMode: 'default' });
    const sub = AudioManager.addSystemEventListener('interruption', (event) =>
      log('interruption', JSON.stringify(event)),
    );
    AudioManager.observeAudioInterruptions(true);
    return () => sub.remove();
  }, []);

  const start = async (variant: Variant) => {
    const runName = `${now()}-${variant.key}`;
    const runDir = new Directory(ROOT, runName);
    runDir.create({ intermediates: true });
    new File(runDir, 'started-at.txt').write(String(now()));

    const rec = new AudioRecorder();
    const enabled = rec.enableFileOutput({
      format: variant.format,
      channelCount: 1,
      preset: {
        sampleRate: variant.sampleRate,
        bitRate: 64000,
        bitDepth: BitDepth.Bit16,
        iosQuality: IOSAudioQuality.High,
        flacCompressionLevel: FlacCompressionLevel.L0,
      },
      rotateIntervalBytes: variant.rotateBytes,
      directory: FileDirectory.Document,
      subDirectory: `spike/${runName}`,
      fileNamePrefix: 'seg',
      androidFlushIntervalMs: 200,
    });
    log('enableFileOutput', variant.key, JSON.stringify(enabled));
    const t0 = now();
    const started = await rec.start();
    log('start', variant.key, JSON.stringify(started), `${now() - t0}ms`);
    recorder.current = rec;
    setActive(runName);
    setStatus(`recording ${runName}`);
  };

  const stop = async () => {
    const rec = recorder.current;
    if (!rec || !active) return;
    const result = await rec.stop();
    log('stop', active, JSON.stringify(result));
    new File(new Directory(ROOT, active), 'stopped-at.txt').write(String(now()));
    recorder.current = null;
    setStatus(`stopped ${active}: ${JSON.stringify(result)}`);
    setActive(null);
    refresh();
  };

  /** Joins finished segments (skipping files that cannot be read) and reports durations. */
  const assemble = async (runName: string) => {
    const dir = new Directory(ROOT, runName);
    const segments = dir
      .list()
      .filter((e): e is File => e instanceof File && e.name.startsWith('seg'))
      .sort((a, b) => a.name.localeCompare(b.name));
    const readable: string[] = [];
    const report: string[] = [];
    for (const seg of segments) {
      if (seg.name.endsWith('.wav')) report.push(`${seg.name}: ${repairWav(seg)}`);
      try {
        const duration = await getAudioDuration(seg.uri);
        readable.push(seg.uri.replace('file://', ''));
        report.push(`${seg.name}: ${duration.toFixed(3)} s, ${seg.size} B`);
      } catch (error) {
        report.push(`${seg.name}: UNREADABLE (${String(error)}), ${seg.size} B`);
      }
    }
    if (readable.length > 1) {
      const ext = readable[0]?.endsWith('.wav') ? 'wav' : 'm4a';
      const out = new File(dir, `joined.${ext}`);
      if (out.exists) out.delete();
      await concatAudioFiles(readable, out.uri.replace('file://', ''));
      report.push(`joined: ${(await getAudioDuration(out.uri)).toFixed(3)} s, ${out.size} B`);
    }
    log('assemble', runName, '\n' + report.join('\n'));
    setStatus(report.join('\n'));
    refresh();
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>D-021 test bench</Text>
      <Text selectable>{status}</Text>
      <View style={styles.row}>
        {VARIANTS.map((v) => (
          <Pressable
            key={v.key}
            accessibilityRole="button"
            accessibilityLabel={`start ${v.key}`}
            disabled={active !== null}
            onPress={() => void start(v)}
            style={styles.button}
          >
            <Text>{`start ${v.key}`}</Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="stop"
          onPress={() => void stop()}
          style={styles.button}
        >
          <Text>stop</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="refresh"
          onPress={refresh}
          style={styles.button}
        >
          <Text>refresh</Text>
        </Pressable>
      </View>
      {runs.map((run) => (
        <View key={run.name} style={styles.run}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`assemble ${run.name}`}
            onPress={() => void assemble(run.name)}
          >
            <Text style={styles.runTitle}>{`${run.name} (assemble)`}</Text>
          </Pressable>
          <Text selectable>{run.files.map((f) => `${f.name} ${f.size} B`).join('\n')}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { padding: 12, borderWidth: 1, borderRadius: 8 },
  run: { gap: 4, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  runTitle: { fontWeight: '600' },
});
