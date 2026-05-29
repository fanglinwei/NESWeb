// ============================================================
// NES 控制器位掩码
// ============================================================
// bit 0: A       bit 4: Up
// bit 1: B       bit 5: Down
// bit 2: Select  bit 6: Left
// bit 3: Start   bit 7: Right
export const NES_BUTTON = {
  A:      0x01,
  B:      0x02,
  SELECT: 0x04,
  START:  0x08,
  UP:     0x10,
  DOWN:   0x20,
  LEFT:   0x40,
  RIGHT:  0x80,
} as const

export type NESButton = keyof typeof NES_BUTTON

// ============================================================
// 主线程 → Worker 消息
// ============================================================
export type MainToWorker =
  | { type: 'LOAD_ROM'; rom: ArrayBuffer }
  | { type: 'INPUT'; controller1: number; controller2: number }
  | { type: 'SAVE_STATE'; slot: number }
  | { type: 'LOAD_STATE'; data: ArrayBuffer }
  | { type: 'RESET' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }

// ============================================================
// Worker → 主线程消息
// ============================================================
export interface ROMInfo {
  mapper: number
  prgRom: number    // PRG ROM 页数 (16KB per page)
  chrRom: number    // CHR ROM 页数 (8KB per page)
}

export type WorkerToMain =
  | { type: 'ROM_LOADED'; info: ROMInfo }
  | { type: 'ROM_ERROR'; error: string }
  | { type: 'FRAME'; video: ArrayBuffer; audio: ArrayBuffer }
  | { type: 'STATE_SAVED'; slot: number; data: ArrayBuffer }
  | { type: 'STATE_LOADED'; ok: true }
  | { type: 'ERROR'; error: string }

// ============================================================
// NES 帧常量
// ============================================================
export const NES_WIDTH = 256
export const NES_HEIGHT = 240
export const NES_FRAME_SIZE = NES_WIDTH * NES_HEIGHT * 4 // RGBA
