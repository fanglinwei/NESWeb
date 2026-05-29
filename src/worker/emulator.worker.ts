/// <reference lib="webworker" />

import type { MainToWorker, WorkerToMain, ROMInfo } from '../types/emulator'

// ============================================================
// WASM 动态导入接口
// ============================================================
interface WasmExports {
  readonly memory: WebAssembly.Memory
}

interface WasmModule {
  default(): Promise<WasmExports>
  load_rom(data: Uint8Array): number
  run_frame(c1: number, c2: number): number
  save_state(): Uint8Array
  load_state(data: Uint8Array): number
  reset(): void
  init(): void
  get_framebuffer_len(): number
  get_framebuffer_ptr(): number
  get_audio_len(): number
  get_audio_ptr(): number
}

// ============================================================
// WASM 初始化
// ============================================================
const wasmUrl = new URL('/wasm/nes_wasm.js', self.location.origin).href

let wasmExports: WasmExports | null = null
let wasm: WasmModule | null = null
let wasmReady = false

try {
  wasm = (await import(/* @vite-ignore */ wasmUrl)) as WasmModule
  wasmExports = await wasm.default()
  wasmReady = true
} catch (e) {
  const msg: WorkerToMain = {
    type: 'ERROR',
    error: `WASM init failed: ${String(e)}`,
  }
  self.postMessage(msg)
}

// ============================================================
// 模拟器运行状态
// ============================================================
let running = false
let controller1Bits = 0
let controller2Bits = 0
let frameTimeout: ReturnType<typeof setTimeout> | null = null

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
// 帧循环 (~60fps via setTimeout)
// ============================================================
function runFrameLoop() {
  if (!running || !wasm || !wasmExports) return

  const start = performance.now()

  try {
    // 执行一帧
    const fbPtr = wasm.run_frame(controller1Bits, controller2Bits)
    const fbLen = wasm.get_framebuffer_len() // 256×240×4 = 245760

    // 从 WASM 线性内存拷贝 RGBA 帧缓冲
    const videoBuffer = new ArrayBuffer(fbLen)
    const videoDst = new Uint8ClampedArray(videoBuffer)
    const videoSrc = new Uint8ClampedArray(wasmExports.memory.buffer, fbPtr, fbLen)
    videoDst.set(videoSrc)

    // 从 WASM 线性内存拷贝音频采样
    const audioLen = wasm.get_audio_len() // f32 采样数
    const audioByteLen = audioLen * 4
    const audioBuffer = new ArrayBuffer(audioByteLen)
    const audioDst = new Uint8Array(audioBuffer)
    const audioSrc = new Uint8Array(
      wasmExports.memory.buffer,
      wasm.get_audio_ptr(),
      audioByteLen,
    )
    audioDst.set(audioSrc)

    // 以 Transferable 发送帧数据（零拷贝）
    const msg: WorkerToMain = {
      type: 'FRAME',
      video: videoBuffer,
      audio: audioBuffer,
    }
    self.postMessage(msg, [videoBuffer, audioBuffer])
  } catch (e) {
    running = false
    const msg: WorkerToMain = {
      type: 'ERROR',
      error: `Frame error: ${String(e)}`,
    }
    self.postMessage(msg)
    return
  }

  // 调度下一帧，补偿本帧耗时
  const elapsed = performance.now() - start
  const delay = Math.max(0, 16.67 - elapsed)
  frameTimeout = setTimeout(runFrameLoop, delay)
}

// ============================================================
// 消息处理函数
// ============================================================
function handleLoadRom(romBuffer: ArrayBuffer) {
  if (!wasm) return

  try {
    const rom = new Uint8Array(romBuffer)
    const result = wasm.load_rom(rom)

    if (result === 0) {
      const info = parseINESHeader(rom)
      const msg: WorkerToMain = { type: 'ROM_LOADED', info }
      self.postMessage(msg)
    } else {
      const msg: WorkerToMain = {
        type: 'ROM_ERROR',
        error: `ROM load failed (code ${result})`,
      }
      self.postMessage(msg)
    }
  } catch (e) {
    const msg: WorkerToMain = { type: 'ROM_ERROR', error: String(e) }
    self.postMessage(msg)
  }
}

function handleInput(c1: number, c2: number) {
  controller1Bits = c1
  controller2Bits = c2
}

function handleSaveState(slot: number) {
  if (!wasm) return

  try {
    const state = wasm.save_state() // Uint8Array (already sliced → own buffer)
    const data = state.buffer as ArrayBuffer
    const msg: WorkerToMain = {
      type: 'STATE_SAVED',
      slot,
      data,
    }
    self.postMessage(msg, [state.buffer])
  } catch (e) {
    const msg: WorkerToMain = {
      type: 'ERROR',
      error: `Save state failed: ${String(e)}`,
    }
    self.postMessage(msg)
  }
}

function handleLoadState(data: ArrayBuffer) {
  if (!wasm) return

  try {
    const state = new Uint8Array(data)
    const result = wasm.load_state(state)

    if (result === 0) {
      const msg: WorkerToMain = { type: 'STATE_LOADED', ok: true }
      self.postMessage(msg)
    } else {
      const msg: WorkerToMain = {
        type: 'ERROR',
        error: `Load state failed (code ${result})`,
      }
      self.postMessage(msg)
    }
  } catch (e) {
    const msg: WorkerToMain = {
      type: 'ERROR',
      error: `Load state failed: ${String(e)}`,
    }
    self.postMessage(msg)
  }
}

function handleReset() {
  if (!wasm) return
  wasm.reset()
}

function handlePause() {
  running = false
  if (frameTimeout !== null) {
    clearTimeout(frameTimeout)
    frameTimeout = null
  }
}

function handleResume() {
  if (running) return
  running = true
  runFrameLoop()
}

// ============================================================
// 主消息监听器
// ============================================================
self.onmessage = (e: MessageEvent<MainToWorker>) => {
  if (!wasmReady || !wasm || !wasmExports) return

  const msg = e.data
  switch (msg.type) {
    case 'LOAD_ROM':
      handleLoadRom(msg.rom)
      break
    case 'INPUT':
      handleInput(msg.controller1, msg.controller2)
      break
    case 'SAVE_STATE':
      handleSaveState(msg.slot)
      break
    case 'LOAD_STATE':
      handleLoadState(msg.data)
      break
    case 'RESET':
      handleReset()
      break
    case 'PAUSE':
      handlePause()
      break
    case 'RESUME':
      handleResume()
      break
  }
}
