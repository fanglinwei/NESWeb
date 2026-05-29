// NES Audio Processor — runs in AudioWorklet thread
// Receives Float32 audio samples and plays them through a ring buffer

const BUFFER_SIZE = 8192  // Must be power of 2 for ring buffer masking

class NESAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buffer = new Float32Array(BUFFER_SIZE)
    this.readIndex = 0
    this.writeIndex = 0
    this.available = 0

    // Listen for audio data from main thread
    this.port.onmessage = (e) => {
      const samples = e.data  // Float32Array
      if (samples && samples.length > 0) {
        for (let i = 0; i < samples.length; i++) {
          this.buffer[this.writeIndex] = samples[i]
          this.writeIndex = (this.writeIndex + 1) & (BUFFER_SIZE - 1)
          // 缓冲区满时丢弃最旧样本，避免覆盖未读数据
          if (this.available >= BUFFER_SIZE) {
            this.readIndex = (this.readIndex + 1) & (BUFFER_SIZE - 1)
          } else {
            this.available++
          }
        }
      }
    }
  }

  process(inputs, outputs) {
    const output = outputs[0]
    if (!output || output.length === 0) return true

    const channel = output[0]
    if (!channel) return true

    // Output audio samples from ring buffer (with speed adjustment if needed)
    for (let i = 0; i < channel.length; i++) {
      if (this.available > 0) {
        channel[i] = this.buffer[this.readIndex]
        this.readIndex = (this.readIndex + 1) & (BUFFER_SIZE - 1)
        this.available--
      } else {
        channel[i] = 0  // Silence
      }
    }

    return true  // Keep processor alive
  }
}

registerProcessor('nes-audio-processor', NESAudioProcessor)
