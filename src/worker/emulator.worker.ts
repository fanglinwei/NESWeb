/// <reference lib="webworker" />

import { NES } from 'jsnes'
import type { ButtonKey } from 'jsnes'
import type { MainToWorker, WorkerToMain, ROMInfo } from '../types/emulator'

// ============================================================
// 常量
// ============================================================
const TARGET_FPS = 60
const FRAME_INTERVAL = 1000 / TARGET_FPS // ~16.67ms
const NES_WIDTH = 256
const NES_HEIGHT = 240
const VIDEO_SIZE = NES_WIDTH * NES_HEIGHT * 4 // RGBA

// 帧缓冲（每帧复用，避免重复分配）
let framebufferRGBA = new Uint8ClampedArray(VIDEO_SIZE)
const audioSamples: number[] = []

// ============================================================
// JSNES 颜色转换：Uint32Array (0xRRGGBB) → RGBA Uint8ClampedArray
// ============================================================
// JSNES palette.js 中颜色以 0xRRGGBB 格式存储（24-bit）。
// 例如 0x525252 → R=0x52, G=0x52, B=0x52 (NES 通用背景色灰)
// 例如 0xB40000 → R=0xB4, G=0x00, B=0x00 (深红)
// 例如 0x0019BC → R=0x00, G=0x19, B=0xBC (NES 蓝色)
function handleJSNESFrame(buffer: Uint32Array): void {
  const dst = framebufferRGBA
  const len = buffer.length
  for (let i = 0; i < len; i++) {
    const color = buffer[i]
    const offset = i << 2 // i * 4
    dst[offset]     = (color >>> 16) & 0xff  // R — bits 23-16
    dst[offset + 1] = (color >>> 8) & 0xff   // G — bits 15-8
    dst[offset + 2] = color & 0xff           // B — bits 7-0
    dst[offset + 3] = 0xff                   // A — 不透明
  }
}

// JSNES 的 onAudioSample 回调：值范围 [-1.0, 1.0]
function handleJSNESAudio(left: number, right: number): void {
  audioSamples.push(left, right)
}

// ============================================================
// JSNES 实例
// ============================================================
const nes = new NES({
  onFrame: handleJSNESFrame,
  onAudioSample: handleJSNESAudio,
  // 使用默认 sampleRate: 48000 — AudioContext 将匹配此值
})

// ============================================================
// ROM 信息解析 (iNES header)
// ============================================================
function parseINESHeader(rom: Uint8Array): ROMInfo {
  const prgRom = rom[4] ?? 0
  const chrRom = rom[5] ?? 0
  const mapperLo = (rom[6] ?? 0) >> 4
  const mapperHi = (rom[7] ?? 0) & 0xf0
  const mapper = mapperLo | mapperHi
  return { mapper, prgRom, chrRom }
}

// ============================================================
// 控制器位掩码 → JSNES 按钮事件
// bit 0=A, bit 1=B, bit 2=Select, bit 3=Start,
// bit 4=Up, bit 5=Down, bit 6=Left, bit 7=Right
// ============================================================
let prevController1 = 0

function applyControllerInput(c1: number): void {
  for (let bit = 0; bit < 8; bit++) {
    const mask = 1 << bit
    const wasPressed = (prevController1 & mask) !== 0
    const isPressed = (c1 & mask) !== 0

    if (isPressed && !wasPressed) {
      nes.buttonDown(1, bit as ButtonKey)
    } else if (!isPressed && wasPressed) {
      nes.buttonUp(1, bit as ButtonKey)
    }
  }
  prevController1 = c1
}

// ============================================================
// 模拟器运行状态
// ============================================================
let running = false
let controller1Bits = 0
let frameTimeout: ReturnType<typeof setTimeout> | null = null

// FPS 统计
let fpsFrameCount = 0
let fpsLastTime = 0

// Worker ready
self.postMessage({ type: 'READY' } satisfies WorkerToMain)

// ============================================================
// 帧循环 — 漂移补偿定时 (~60fps)
// ============================================================
// 使用参考时钟法：记录帧循环启动时刻，每帧目标时间为
// startTime + frameNumber * FRAME_INTERVAL。
// 即使个别帧耗时超标，后续帧会自动追赶，保持长期 60fps 稳定。
let frameStartTime = 0
let targetFrameNumber = 0

function runFrameLoop(): void {
  if (!running) return

  const now = performance.now()
  const targetTime = frameStartTime + targetFrameNumber * FRAME_INTERVAL
  // 如果当前帧已经晚于目标，下一帧立即执行（不延迟）
  const delay = Math.max(0, targetTime - now)

  frameTimeout = setTimeout(() => {
    if (!running) return

    const frameNow = performance.now()

    try {
      // 应用输入
      applyControllerInput(controller1Bits)

      // 清空音频缓冲
      audioSamples.length = 0

      // 运行一帧
      nes.frame()

      // 拷贝帧缓冲
      const videoBuffer = new ArrayBuffer(VIDEO_SIZE)
      const videoView = new Uint8ClampedArray(videoBuffer)
      videoView.set(framebufferRGBA)

      // 拷贝音频（JSNES audio callback 给出的是 [-1, 1] 范围的浮点数）
      const audioBuffer = new ArrayBuffer(audioSamples.length * 4)
      const audioView = new Float32Array(audioBuffer)
      audioView.set(audioSamples)

      // FPS 统计
      fpsFrameCount++
      if (frameNow - fpsLastTime >= 1000) {
        const fps = Math.round(
          fpsFrameCount / ((frameNow - fpsLastTime) / 1000)
        )
        fpsFrameCount = 0
        fpsLastTime = frameNow
        self.postMessage({ type: 'FPS', fps } satisfies WorkerToMain)
      }

      // 发送帧数据（transferable 零拷贝）
      const msg: WorkerToMain = {
        type: 'FRAME',
        video: videoBuffer,
        audio: audioBuffer,
      }
      self.postMessage(msg, [videoBuffer, audioBuffer])

      targetFrameNumber++
    } catch (e) {
      running = false
      console.error(`[Worker] Frame error:`, e)
      self.postMessage({
        type: 'ERROR',
        error: `Frame error: ${String(e)}`,
      } satisfies WorkerToMain)
      return
    }

    // 调度下一帧
    runFrameLoop()
  }, delay)
}

// ============================================================
// 消息处理
// ============================================================
self.onmessage = (e: MessageEvent<MainToWorker>) => {
  const msg = e.data

  switch (msg.type) {
    case 'LOAD_ROM': {
      try {
        nes.loadROM(msg.rom)

        const rom = new Uint8Array(msg.rom)
        const info = parseINESHeader(rom)
        self.postMessage({ type: 'ROM_LOADED', info } satisfies WorkerToMain)

        // 重置输入状态
        prevController1 = 0
        controller1Bits = 0

        // 重置帧时序
        frameStartTime = performance.now()
        targetFrameNumber = 0
        fpsFrameCount = 0
        fpsLastTime = performance.now()

        if (!running) {
          running = true
          runFrameLoop()
        }
      } catch (err) {
        self.postMessage({
          type: 'ROM_ERROR',
          error: `ROM 加载失败: ${String(err)}`,
        } satisfies WorkerToMain)
      }
      break
    }

    case 'INPUT': {
      controller1Bits = msg.controller1
      break
    }

    case 'SAVE_STATE': {
      try {
        const json = JSON.stringify(nes.toJSON())
        const encoded = new TextEncoder().encode(json)
        // 确保 buffer 大小匹配实际数据长度
        const data = encoded.buffer.slice(0, encoded.byteLength) as ArrayBuffer
        self.postMessage(
          { type: 'STATE_SAVED', slot: msg.slot, data } satisfies WorkerToMain,
          [data],
        )
      } catch (err) {
        self.postMessage({
          type: 'ERROR',
          error: `存档失败: ${String(err)}`,
        } satisfies WorkerToMain)
      }
      break
    }

    case 'LOAD_STATE': {
      try {
        const json = new TextDecoder().decode(new Uint8Array(msg.data))
        nes.fromJSON(JSON.parse(json))
        prevController1 = 0
        controller1Bits = 0
        self.postMessage({ type: 'STATE_LOADED', ok: true } satisfies WorkerToMain)
      } catch (err) {
        self.postMessage({
          type: 'ERROR',
          error: `读档失败: ${String(err)}`,
        } satisfies WorkerToMain)
      }
      break
    }

    case 'RESET': {
      nes.reset()
      prevController1 = 0
      controller1Bits = 0
      frameStartTime = performance.now()
      targetFrameNumber = 0
      break
    }

    case 'PAUSE': {
      running = false
      if (frameTimeout !== null) {
        clearTimeout(frameTimeout)
        frameTimeout = null
      }
      break
    }

    case 'RESUME': {
      if (!running) {
        running = true
        frameStartTime = performance.now()
        targetFrameNumber = 0
        runFrameLoop()
      }
      break
    }
  }
}
