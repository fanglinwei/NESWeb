import { create } from 'zustand'
import type { ROMInfo } from '../types/emulator'
import type { ROMListItem } from '../utils/db'

export type EmulationStatus = 'idle' | 'loading' | 'running' | 'paused'

export interface EmulatorState {
  // 模拟状态
  status: EmulationStatus
  fps: number
  frameCount: number

  // 当前 ROM
  currentROM: { name: string; info: ROMInfo } | null

  // ROM 库
  recentROMs: ROMListItem[]

  // UI 状态
  notification: string | null
  controlsVisible: boolean

  // Actions
  setStatus: (status: EmulationStatus) => void
  setFps: (fps: number) => void
  incrementFrame: () => void
  setCurrentROM: (rom: { name: string; info: ROMInfo } | null) => void
  setRecentROMs: (roms: ROMListItem[]) => void
  showNotification: (msg: string) => void
  dismissNotification: () => void
  setControlsVisible: (visible: boolean) => void
}

export const useEmulatorStore = create<EmulatorState>((set) => ({
  status: 'idle',
  fps: 0,
  frameCount: 0,
  currentROM: null,
  recentROMs: [],
  notification: null,
  controlsVisible: true,

  setStatus: (status) => set({ status }),
  setFps: (fps) => set({ fps }),
  incrementFrame: () => set((s) => ({ frameCount: s.frameCount + 1 })),
  setCurrentROM: (rom) => set({ currentROM: rom }),
  setRecentROMs: (roms) => set({ recentROMs: roms }),
  showNotification: (msg) => set({ notification: msg }),
  dismissNotification: () => set({ notification: null }),
  setControlsVisible: (visible) => set({ controlsVisible: visible }),
}))
