import AVFoundation
import ExpoModulesCore

// Written for parity with Android; tested only once the iOS debt is settled (D-022).
// Floats are little-endian on every iOS device, as decodePcm returns them.
public class AudioEncoderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AudioEncoder")

    Events("onTranscriptionServiceTimeout")

    AsyncFunction("encodeToM4a") { (inputs: [String], output: String, bitRate: Int) throws -> Double in
      try encodeToM4a(inputs: inputs, output: output, bitRate: bitRate)
    }

    AsyncFunction("decodePcm") { (path: String, startMs: Double, durationMs: Double) throws -> Data in
      try decodePcm(path: path, startMs: startMs, durationMs: durationMs)
    }

    // No foreground service on iOS: a transcription advances while the app is open (D-022).
    AsyncFunction("startTranscriptionService") { (_: String, _: String, _: String, _: Int?) in }
    AsyncFunction("updateTranscriptionService") { (_: String, _: String, _: String, _: Int?) in }
    AsyncFunction("stopTranscriptionService") {}
  }
}

/// Little-endian Float32 PCM, 16 kHz mono, of one window of a `.m4a` or WAV file (step 3).
private func decodePcm(path: String, startMs: Double, durationMs: Double) throws -> Data {
  let file = try AVAudioFile(forReading: URL(fileURLWithPath: path))
  let format = file.processingFormat
  guard format.sampleRate == 16_000, format.commonFormat == .pcmFormatFloat32 else {
    throw Exception(name: "UnsupportedFormat", description: "16 kHz audio expected: \(path)")
  }
  let first = AVAudioFramePosition((startMs * 16).rounded())
  let wanted = AVAudioFrameCount(max(0, (durationMs * 16).rounded()))
  guard first < file.length, wanted > 0 else { return Data() }
  file.framePosition = first
  let count = min(wanted, AVAudioFrameCount(file.length - first))
  guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: count),
        let channels = buffer.floatChannelData else {
    throw Exception(name: "NoBuffer", description: "Cannot allocate an audio buffer")
  }
  try file.read(into: buffer, frameCount: count)
  let frames = Int(buffer.frameLength)
  let channelCount = Int(format.channelCount)
  var mono = [Float](repeating: 0, count: frames)
  for c in 0..<channelCount {
    for i in 0..<frames { mono[i] += channels[c][i] / Float(channelCount) }
  }
  return mono.withUnsafeBufferPointer { Data(buffer: $0) }
}

/// Encodes 16-bit PCM WAV files, in order, into one AAC `.m4a`; returns the duration in ms.
/// The writer is released when this function returns, which finalises the file.
private func encodeToM4a(inputs: [String], output: String, bitRate: Int) throws -> Double {
  guard let firstPath = inputs.first else {
    throw Exception(name: "NoInput", description: "No input file")
  }
  let format = try AVAudioFile(forReading: URL(fileURLWithPath: firstPath)).processingFormat
  let outputURL = URL(fileURLWithPath: output)
  try? FileManager.default.removeItem(at: outputURL)
  let settings: [String: Any] = [
    AVFormatIDKey: kAudioFormatMPEG4AAC,
    AVSampleRateKey: format.sampleRate,
    AVNumberOfChannelsKey: format.channelCount,
    AVEncoderBitRateKey: bitRate,
  ]
  let writer = try AVAudioFile(
    forWriting: outputURL,
    settings: settings,
    commonFormat: format.commonFormat,
    interleaved: format.isInterleaved
  )
  var frames: AVAudioFramePosition = 0
  for path in inputs {
    let file = try AVAudioFile(forReading: URL(fileURLWithPath: path))
    guard let buffer = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: 16_384) else {
      throw Exception(name: "NoBuffer", description: "Cannot allocate an audio buffer")
    }
    while file.framePosition < file.length {
      try file.read(into: buffer)
      if buffer.frameLength == 0 { break }
      try writer.write(from: buffer)
      frames += AVAudioFramePosition(buffer.frameLength)
    }
  }
  return Double(frames) * 1000 / format.sampleRate
}
