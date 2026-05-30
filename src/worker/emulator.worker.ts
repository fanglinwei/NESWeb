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
// ============================================================
// 标准 NES NTSC 调色板（64 色，0xRRGGBB）
// 来源：基于 NESdev wiki 标准测量值，广泛用于 FCEUX/Nestopia/Mesen
// JSNES 默认调色板与标准差异较大，导致游戏画面偏色
// ============================================================
const STANDARD_NES_PALETTE = new Uint32Array([
  0x666666, 0x002A88, 0x1412A7, 0x3B00A4, 0x5C007E, 0x6E0040, 0x6C0600, 0x561D00,
  0x333500, 0x0B4800, 0x005200, 0x004F08, 0x00404D, 0x000000, 0x000000, 0x000000,
  0xADADAD, 0x155FD9, 0x4240FF, 0x7527FE, 0xA01ACC, 0xB71E7B, 0xB53120, 0x994E00,
  0x6B6D00, 0x388700, 0x0C9300, 0x008F32, 0x007C8D, 0x000000, 0x000000, 0x000000,
  0xFFFFFF, 0x64B0FF, 0x9290FF, 0xC676FF, 0xF36AFF, 0xFE6ECC, 0xFE8170, 0xEA9E22,
  0xBCBE00, 0x88D800, 0x5CE430, 0x45E082, 0x48CDDE, 0x4F4F4F, 0x000000, 0x000000,
  0xFFFFFF, 0xC0DFFF, 0xD3D2FF, 0xE8C8FF, 0xFBC2FF, 0xFEC4EA, 0xFECCC5, 0xF7D8A5,
  0xE4E594, 0xCFEF96, 0xBDF4AB, 0xB3F3CC, 0xB5EBF2, 0xB8B8B8, 0x000000, 0x000000,
])

// JSNES 颜色转换：Uint32Array (0xRRGGBB) → RGBA Uint8ClampedArray
function handleJSNESFrame(buffer: Uint32Array): void {
  const dst = framebufferRGBA
  for (let i = 0; i < buffer.length; i++) {
    const color = buffer[i]
    const offset = i << 2
    dst[offset]     = (color >>> 16) & 0xff  // R
    dst[offset + 1] = (color >>> 8) & 0xff   // G
    dst[offset + 2] = color & 0xff           // B
    dst[offset + 3] = 0xff                   // A
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
})

// 替换 JSNES 默认调色板为标准 NES NTSC 调色板
// JSNES 内置色板与标准 NES 颜色差异较大（如索引 $21 是橙色而非浅蓝）
// 这里用 NESdev 社区标准色板覆盖，确保游戏画面颜色准确
const ptable = (nes as any).ppu.palTable
ptable.curTable = STANDARD_NES_PALETTE
ptable.makeTables()
ptable.setEmphasis(0)

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
