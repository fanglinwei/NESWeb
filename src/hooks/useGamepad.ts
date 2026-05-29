import { useEffect, useRef } from 'react'
import { NES_BUTTON } from '../types/emulator'

// 默认 Gamepad 映射（标准 Xbox/PS 布局）
const GAMEPAD_MAP: Record<number, number> = {
  0:  NES_BUTTON.A,      // A / Cross
  1:  NES_BUTTON.B,      // B / Circle
  8:  NES_BUTTON.SELECT, // Select / Share
  9:  NES_BUTTON.START,  // Start / Options
  12: NES_BUTTON.UP,     // D-pad Up
  13: NES_BUTTON.DOWN,   // D-pad Down
  14: NES_BUTTON.LEFT,   // D-pad Left
  15: NES_BUTTON.RIGHT,  // D-pad Right
}

// 摇杆方向阈值（在死区之外，超过此值触发方向键）
const STICK_THRESHOLD = 0.5

// 摇杆轴映射
const STICK_AXIS_MAP: Array<{ axis: number; negative: number; positive: number }> = [
  { axis: 0, negative: NES_BUTTON.LEFT, positive: NES_BUTTON.RIGHT },  // 左摇杆 X
  { axis: 1, negative: NES_BUTTON.UP, positive: NES_BUTTON.DOWN },      // 左摇杆 Y
]

// 从摇杆轴值计算方向位掩码
function getStickState(gamepad: Gamepad): number {
  let state = 0
  for (const { axis, negative, positive } of STICK_AXIS_MAP) {
    const value = gamepad.axes[axis] ?? 0
    if (value < -STICK_THRESHOLD) state |= negative
    else if (value > STICK_THRESHOLD) state |= positive
  }
  return state
}

// 从按钮计算状态
function getButtonState(gamepad: Gamepad): number {
  let state = 0
  for (const [index, button] of Object.entries(GAMEPAD_MAP)) {
    if (gamepad.buttons[Number(index)]?.pressed) {
      state |= button
    }
  }
  return state
}

export function useGamepad(enabled: boolean, onInputChange: (controllerState: number) => void): void {
  const prevStateRef = useRef(0)
  const animFrameRef = useRef(0)
  const onInputRef = useRef(onInputChange)
  onInputRef.current = onInputChange

  useEffect(() => {
    if (!enabled) return

    let running = true

    const poll = () => {
      if (!running) return

      const gamepads = navigator.getGamepads()
      let controllerState = 0

      // 检查所有已连接的手柄
      for (const gamepad of gamepads) {
        if (!gamepad) continue
        controllerState |= getButtonState(gamepad) | getStickState(gamepad)
      }

      // 只在状态变化时通知（避免每帧都触发）
      if (controllerState !== prevStateRef.current) {
        prevStateRef.current = controllerState
        onInputRef.current(controllerState)
      }

      animFrameRef.current = requestAnimationFrame(poll)
    }

    // 监听手柄连接/断开
    const handleDisconnect = () => {
      prevStateRef.current = 0
      onInputRef.current(0)
    }

    window.addEventListener('gamepadconnected', () => {})
    window.addEventListener('gamepaddisconnected', handleDisconnect)

    // 开始轮询
    animFrameRef.current = requestAnimationFrame(poll)

    return () => {
      running = false
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('gamepaddisconnected', handleDisconnect)
    }
  }, [enabled])
}
