import AVFoundation
import ExpoModulesCore

// Written for parity with Android; tested only once the iOS debt is settled (D-022).
public class AudioEncoderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AudioEncoder")

    AsyncFunction("encodeToM4a") { (inputs: [String], output: String, bitRate: Int) throws -> Double in
      try encodeToM4a(inputs: inputs, output: output, bitRate: bitRate)
    }
  }
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
