package expo.modules.audioencoder

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.roundToLong

/**
 * Decodes one window of a recording into Float32 PCM, 16 kHz mono, for Whisper (step 3).
 * A window at a time: one hour as Float32 would be 230 MB, too much for an entry-level phone.
 */
internal object PcmDecoder {
  const val SAMPLE_RATE = 16_000
  private const val TIMEOUT_US = 10_000L
  /** Decoded before the window and dropped: the first AAC frame after a seek is not clean. */
  private const val PREROLL_US = 200_000L

  /** Little-endian Float32 samples of [startMs, startMs + durationMs); shorter at the end of the file. */
  fun decode(path: String, startMs: Double, durationMs: Double): ByteArray {
    val first = (startMs * SAMPLE_RATE / 1000).roundToLong().coerceAtLeast(0)
    val count = (durationMs * SAMPLE_RATE / 1000).roundToLong().coerceAtLeast(0).toInt()
    val window = Window(first, count)
    if (count > 0) {
      if (path.endsWith(".wav", ignoreCase = true)) decodeWav(path, window) else decodeCompressed(path, window)
    }
    return window.bytes()
  }

  /** The WAV kept when encoding failed (D-021): PCM read in place. */
  private fun decodeWav(path: String, window: Window) {
    val source = WavSource(path)
    try {
      require(source.sampleRate == SAMPLE_RATE) { "Unsupported sample rate ${source.sampleRate}: $path" }
      val frameBytes = 2L * source.channels
      val frames = source.dataSize / frameBytes
      if (window.first >= frames) return
      val available = minOf(window.count.toLong(), frames - window.first).toInt()
      val bytes = ByteArray(available * frameBytes.toInt())
      source.file.seek(source.dataOffset + window.first * frameBytes)
      source.file.readFully(bytes)
      val shorts = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
      for (i in 0 until available) window.put(window.first + i, mono(shorts, i, source.channels))
    } finally {
      source.file.close()
    }
  }

  /** The `.m4a` (AAC-LC 16 kHz mono, D-036) through the platform decoder. */
  private fun decodeCompressed(path: String, window: Window) {
    val extractor = MediaExtractor()
    var codec: MediaCodec? = null
    try {
      extractor.setDataSource(path)
      val track = (0 until extractor.trackCount).firstOrNull {
        extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true
      } ?: error("No audio track: $path")
      extractor.selectTrack(track)
      val format = extractor.getTrackFormat(track)
      val rate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
      require(rate == SAMPLE_RATE) { "Unsupported sample rate $rate: $path" }
      val startUs = window.first * 1_000_000L / SAMPLE_RATE
      extractor.seekTo((startUs - PREROLL_US).coerceAtLeast(0), MediaExtractor.SEEK_TO_PREVIOUS_SYNC)

      val decoder = MediaCodec.createDecoderByType(format.getString(MediaFormat.KEY_MIME)!!)
      codec = decoder
      decoder.configure(format, null, null, 0)
      decoder.start()
      var channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
      val info = MediaCodec.BufferInfo()
      var inputDone = false
      while (!window.full) {
        if (!inputDone) {
          val inIndex = decoder.dequeueInputBuffer(TIMEOUT_US)
          if (inIndex >= 0) {
            val buffer = decoder.getInputBuffer(inIndex) ?: error("No input buffer")
            val size = extractor.readSampleData(buffer, 0)
            if (size < 0) {
              decoder.queueInputBuffer(inIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
              inputDone = true
            } else {
              decoder.queueInputBuffer(inIndex, 0, size, extractor.sampleTime, 0)
              extractor.advance()
            }
          }
        }
        // Drain every frame ready now, as the encoder does (D-021).
        var ended = false
        while (!window.full) {
          val outIndex = decoder.dequeueOutputBuffer(info, if (inputDone) TIMEOUT_US else 0L)
          if (outIndex == MediaCodec.INFO_TRY_AGAIN_LATER) break
          if (outIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
            channels = decoder.outputFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            continue
          }
          if (outIndex < 0) continue
          val out = decoder.getOutputBuffer(outIndex) ?: error("No output buffer")
          if (info.size > 0) {
            out.position(info.offset)
            out.limit(info.offset + info.size)
            val shorts = out.slice().order(ByteOrder.nativeOrder()).asShortBuffer()
            // Positions come from the timestamps, so a seek or a trimmed priming cannot shift them.
            val at = (info.presentationTimeUs * SAMPLE_RATE / 1_000_000.0).roundToLong()
            for (i in 0 until shorts.remaining() / channels) window.put(at + i, mono(shorts, i, channels))
          }
          decoder.releaseOutputBuffer(outIndex, false)
          if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
            ended = true
            break
          }
        }
        if (ended) break
      }
    } finally {
      codec?.let {
        runCatching { it.stop() }
        it.release()
      }
      extractor.release()
    }
  }

  private fun mono(shorts: java.nio.ShortBuffer, frame: Int, channels: Int): Float {
    var sum = 0f
    for (c in 0 until channels) sum += shorts.get(frame * channels + c)
    return sum / channels / 32768f
  }

  /** The requested samples; those outside are dropped, the last one written sets the length. */
  private class Window(val first: Long, val count: Int) {
    private val samples = FloatArray(count)
    private var end = 0
    val full get() = end >= count

    fun put(index: Long, value: Float) {
      val i = index - first
      if (i < 0 || i >= count) return
      samples[i.toInt()] = value
      if (i.toInt() + 1 > end) end = i.toInt() + 1
    }

    fun bytes(): ByteArray {
      val buffer = ByteBuffer.allocate(end * 4).order(ByteOrder.LITTLE_ENDIAN)
      buffer.asFloatBuffer().put(samples, 0, end)
      return buffer.array()
    }
  }
}
