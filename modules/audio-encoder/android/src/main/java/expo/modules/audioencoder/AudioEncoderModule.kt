package expo.modules.audioencoder

import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AudioEncoderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AudioEncoder")

    AsyncFunction("encodeToM4a") Coroutine { inputs: List<String>, output: String, bitRate: Int ->
      withContext(Dispatchers.IO) { WavToAacEncoder.encode(inputs, output, bitRate) }
    }
  }
}
