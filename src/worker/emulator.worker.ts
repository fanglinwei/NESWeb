/// <reference lib="webworker" />

import { NES } from 'jsnes'
import type { ButtonKey } from 'jsnes'
import type { MainToWorker, WorkerToMain, ROMInfo } from '../types/emulator'

// ============================================================
// JSNES 实例
// ============================================================
const VIDEO_SIZE = 256 * 240 * 4 // RGBA

// 帧缓冲 + 音频缓冲（每帧更新）
let framebuffer = new Uint8ClampedArray(VIDEO_SIZE)
const audioSamples: number[] = []

// JSNES 的 onFrame 回调：buffer 是 Uint32Array，每个元素是 0xFFRRGGBB
function handleJSNESFrame(buffer: Uint32Array): void {
  const dst = framebuffer
  for (let i = 0; i < buffer.length; i++) {
    const color = buffer[i]
    const offset = i * 4
    dst[offset]     = (color >> 16) & 0xff  // R
    dst[offset + 1] = (color >> 8) & 0xff   // G
    dst[offset + 2] = color & 0xff          // B
    dst[offset + 3] = 0xff                  // A
  }
}

// JSNES 的 onAudioSample 回调
function handleJSNESAudio(left: number, right: number): void {
  audioSamples.push(left, right)
}

const nes = new NES({
  onFrame: handleJSNESFrame,
  onAudioSample: handleJSNESAudio,
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
// ============================================================
// bit 0=A, bit 1=B, bit 2=Select, bit 3=Start, bit 4=Up, bit 5=Down, bit 6=Left, bit 7=Right
// JSNES ButtonKey = 0|1|2|3|4|5|6|7|8|9 — 直接对应位索引

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

// Worker ready
self.postMessage({ type: 'READY' } satisfies WorkerToMain)

// ============================================================
// 帧循环 (~60fps)
// ============================================================
function runFrameLoop(): void {
  if (!running) return

  const start = performance.now()

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
    videoView.set(framebuffer)

    // 拷贝音频
    const audioBuffer = new ArrayBuffer(audioSamples.length * 4)
    const audioView = new Float32Array(audioBuffer)
    audioView.set(audioSamples)

    // 发送帧数据
    const msg: WorkerToMain = {
      type: 'FRAME',
      video: videoBuffer,
      audio: audioBuffer,
    }
    self.postMessage(msg, [videoBuffer, audioBuffer])
  } catch (e) {
    running = false
    console.error(`[Worker] Frame error:`, e)
    self.postMessage({
      type: 'ERROR',
      error: `Frame error: ${String(e)}`,
    } satisfies WorkerToMain)
    return
  }

  const elapsed = performance.now() - start
  const delay = Math.max(0, 16.67 - elapsed)
  frameTimeout = setTimeout(runFrameLoop, delay)
}

// ============================================================
// 消息处理
// ============================================================
// 注：目前仅支持单玩家（controller1）。
// controller2 将在联机功能（Phase 6）中启用。

self.onmessage = (e: MessageEvent<MainToWorker>) => {
  const msg = e.data

  switch (msg.type) {
    case 'LOAD_ROM': {
      try {
        // JSNES 原生支持 ArrayBuffer，无需转换为字符串
        nes.loadROM(msg.rom)

        const rom = new Uint8Array(msg.rom)
        const info = parseINESHeader(rom)
        self.postMessage({ type: 'ROM_LOADED', info } satisfies WorkerToMain)

        // 自动启动 / 热切换 ROM 时重置输入状态
        prevController1 = 0
        controller1Bits = 0
        if (!running) {
          running = true
          runFrameLoop()
        }
      } catch (err) {
        self.postMessage({
          type: 'ROM_ERROR',
          error: `ROM load failed: ${String(err)}`,
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
        const state = nes.toJSON()
        const json = JSON.stringify(state)
        const encoder = new TextEncoder()
        const encoded = encoder.encode(json)
        const data = encoded.buffer.slice(0) as ArrayBuffer
        self.postMessage(
          { type: 'STATE_SAVED', slot: msg.slot, data } satisfies WorkerToMain,
          [data],
        )
      } catch (err) {
        self.postMessage({
          type: 'ERROR',
          error: `Save state failed: ${String(err)}`,
        } satisfies WorkerToMain)
      }
      break
    }

    case 'LOAD_STATE': {
      try {
        const decoder = new TextDecoder()
        const json = decoder.decode(new Uint8Array(msg.data))
        const state = JSON.parse(json)
        nes.fromJSON(state)
        // 重置输入状态以匹配加载的状态，避免边沿检测误判
        prevController1 = 0
        controller1Bits = 0
        self.postMessage({ type: 'STATE_LOADED', ok: true } satisfies WorkerToMain)
      } catch (err) {
        self.postMessage({
          type: 'ERROR',
          error: `Load state failed: ${String(err)}`,
        } satisfies WorkerToMain)
      }
      break
    }

    case 'RESET': {
      nes.reset()
      prevController1 = 0
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
        runFrameLoop()
      }
      break
    }
  }
}
