package expo.modules.audioencoder

import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMuxer
import java.io.File
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder

/** PCM data of one WAV file; tolerates a header left stale by a kill (sizes taken from the file). */
internal class WavSource(path: String) {
  val file = RandomAccessFile(path, "r")
  var sampleRate = 0
    private set
  var channels = 0
    private set
  var dataOffset = 0L
    private set
  var dataSize = 0L
    private set

  init {
    val riff = readBytes(0, 12)
    require(String(riff, 0, 4, Charsets.US_ASCII) == "RIFF" && String(riff, 8, 4, Charsets.US_ASCII) == "WAVE") {
      "Not a WAV file: $path"
    }
    var offset = 12L
    var bitsPerSample = 0
    while (offset + 8 <= file.length()) {
      val chunk = readBytes(offset, 8)
      val id = String(chunk, 0, 4, Charsets.US_ASCII)
      val size = ByteBuffer.wrap(chunk, 4, 4).order(ByteOrder.LITTLE_ENDIAN).int.toLong() and 0xffffffffL
      if (id == "fmt ") {
        val fmt = ByteBuffer.wrap(readBytes(offset + 8, 16)).order(ByteOrder.LITTLE_ENDIAN)
        fmt.short // format tag
        channels = fmt.short.toInt()
        sampleRate = fmt.int
        fmt.int // byte rate
        fmt.short // block align
        bitsPerSample = fmt.short.toInt()
      } else if (id == "data") {
        dataOffset = offset + 8
        val available = file.length() - dataOffset
        val declared = if (size == 0L || size > available) available else size
        dataSize = declared / (2L * channels) * (2L * channels)
        break
      }
      offset += 8 + size + (size and 1L)
    }
    require(bitsPerSample == 16 && channels > 0 && sampleRate > 0 && dataOffset > 0) {
      "Unsupported WAV (16-bit PCM expected): $path"
    }
  }

  private fun readBytes(at: Long, count: Int): ByteArray {
    val bytes = ByteArray(count)
    file.seek(at)
    file.readFully(bytes)
    return bytes
  }
}

/** Reads the PCM of several WAV files as one continuous stream. */
internal class PcmStream(private val sources: List<WavSource>) {
  private var index = 0
  private var remaining = 0L

  init {
    open(0)
  }

  private fun open(i: Int) {
    index = i
    if (i < sources.size) {
      sources[i].file.seek(sources[i].dataOffset)
      remaining = sources[i].dataSize
    }
  }

  /** Fills `into` with up to `max` bytes; 0 at the end of the last file. */
  fun read(into: ByteArray, max: Int): Int {
    var filled = 0
    while (filled < max && index < sources.size) {
      if (remaining <= 0) {
        open(index + 1)
        continue
      }
      val want = minOf((max - filled).toLong(), remaining).toInt()
      val n = sources[index].file.read(into, filled, want)
      if (n <= 0) {
        remaining = 0
      } else {
        filled += n
        remaining -= n
      }
    }
    return filled
  }
}

internal object WavToAacEncoder {
  private const val TIMEOUT_US = 10_000L
  private const val CHUNK_BYTES = 16 * 1024

  /** Encodes `inputs` (same rate and channel count) into `output`; returns the PCM duration in ms. */
  fun encode(inputs: List<String>, output: String, bitRate: Int): Double {
    require(inputs.isNotEmpty()) { "No input file" }
    val sources = inputs.map { WavSource(it) }
    try {
      val first = sources.first()
      require(sources.all { it.sampleRate == first.sampleRate && it.channels == first.channels }) {
        "Inputs differ in sample rate or channel count"
      }
      return encodeStream(PcmStream(sources), first.sampleRate, first.channels, output, bitRate)
    } finally {
      sources.forEach { it.file.close() }
    }
  }

  private fun encodeStream(pcm: PcmStream, sampleRate: Int, channels: Int, output: String, bitRate: Int): Double {
    val format = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_AAC, sampleRate, channels).apply {
      setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC)
      setInteger(MediaFormat.KEY_BIT_RATE, bitRate)
      setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, CHUNK_BYTES)
    }
    val codec = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_AAC)
    File(output).delete()
    val muxer = MediaMuxer(output, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
    val frameBytes = 2 * channels
    val chunk = ByteArray(CHUNK_BYTES)
    val info = MediaCodec.BufferInfo()
    var framesQueued = 0L
    var track = -1
    var inputDone = false
    var outputDone = false
    try {
      codec.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
      codec.start()
      while (!outputDone) {
        if (!inputDone) {
          val inIndex = codec.dequeueInputBuffer(TIMEOUT_US)
          if (inIndex >= 0) {
            val buffer = codec.getInputBuffer(inIndex) ?: error("No input buffer")
            buffer.clear()
            val max = minOf(buffer.capacity(), CHUNK_BYTES) / frameBytes * frameBytes
            val n = pcm.read(chunk, max)
            val ptsUs = framesQueued * 1_000_000L / sampleRate
            if (n <= 0) {
              codec.queueInputBuffer(inIndex, 0, 0, ptsUs, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
              inputDone = true
            } else {
              buffer.put(chunk, 0, n)
              codec.queueInputBuffer(inIndex, 0, n, ptsUs, 0)
              framesQueued += n / frameBytes
            }
          }
        }
        val outIndex = codec.dequeueOutputBuffer(info, TIMEOUT_US)
        if (outIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
          track = muxer.addTrack(codec.outputFormat)
          muxer.start()
        } else if (outIndex >= 0) {
          val out = codec.getOutputBuffer(outIndex) ?: error("No output buffer")
          if (info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG != 0) info.size = 0
          if (info.size > 0 && track >= 0) {
            out.position(info.offset)
            out.limit(info.offset + info.size)
            muxer.writeSampleData(track, out, info)
          }
          codec.releaseOutputBuffer(outIndex, false)
          if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) outputDone = true
        }
      }
    } finally {
      runCatching { codec.stop() }
      codec.release()
      if (track >= 0) runCatching { muxer.stop() }
      muxer.release()
    }
    return framesQueued * 1000.0 / sampleRate
  }
}
