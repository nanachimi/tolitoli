package expo.modules.audioencoder

import android.app.ForegroundServiceStartNotAllowedException
import android.os.Build
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class BackgroundStartException(cause: Throwable) :
  CodedException("ERR_BACKGROUND_START", "The service cannot start while the app is in the background", cause)

class AudioEncoderModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("AudioEncoder")

    Events("onTranscriptionServiceTimeout")

    OnCreate {
      TranscriptionService.onTimeoutListener = { sendEvent("onTranscriptionServiceTimeout") }
    }

    OnDestroy {
      TranscriptionService.onTimeoutListener = null
    }

    AsyncFunction("encodeToM4a") Coroutine { inputs: List<String>, output: String, bitRate: Int ->
      withContext(Dispatchers.IO) { WavToAacEncoder.encode(inputs, output, bitRate) }
    }

    AsyncFunction("decodePcm") Coroutine { path: String, startMs: Double, durationMs: Double ->
      withContext(Dispatchers.IO) { PcmDecoder.decode(path, startMs, durationMs) }
    }

    AsyncFunction("probeDurationMs") Coroutine { path: String ->
      withContext(Dispatchers.IO) { PcmDecoder.durationMs(path) }
    }

    AsyncFunction("startTranscriptionService") { title: String, body: String, channelName: String, color: Int? ->
      try {
        TranscriptionService.start(context, title, body, channelName, color)
      } catch (e: Exception) {
        // Android 12+: a foreground service cannot start from the background; the queue waits.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && e is ForegroundServiceStartNotAllowedException) {
          throw BackgroundStartException(e)
        }
        throw e
      }
    }

    AsyncFunction("updateTranscriptionService") { title: String, body: String, channelName: String, color: Int? ->
      TranscriptionService.update(context, title, body, channelName, color)
    }

    AsyncFunction("stopTranscriptionService") {
      TranscriptionService.stop(context)
    }
  }
}
