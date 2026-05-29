# NES Web 模拟器 — Phase 2 实施计划（流畅体验）

> **For agentic workers:** Use superpowers:subagent-driven-development.

**Goal:** 存档/读档持久化到 IndexedDB，Gamepad API 支持，AudioWorklet 低延迟音频，全屏/键位优化

**Architecture:** 在 Phase 1 基础上增加 IndexedDB 存储层，Gamepad API 轮询，AudioWorklet 替换 createBufferSource

---

### Task 14: IndexedDB 工具层

**Files:** Create `src/utils/db.ts`

IndexedDB 封装，提供 saveState / loadState / listStates / deleteState / storeROM / listROMs / getROM 接口。

### Task 15: 存档持久化到 IndexedDB

**Files:** Modify `src/hooks/useEmulator.ts`

监听 STATE_SAVED 消息 → 存入 IndexedDB。新增 loadSavedState() 从 DB 读取并恢复。存档管理 UI 数据从 IndexedDB 读取。

### Task 16: Gamepad API Hook

**Files:** Create `src/hooks/useGamepad.ts`

polling 方式（rAF）读取 Gamepad API，映射到 NES 位掩码。与键盘输入合并后再发给 Worker。

### Task 17: AudioWorklet 低延迟音频

**Files:** Create `src/worker/audio-worklet.ts`, Modify `src/hooks/useEmulator.ts`

创建 AudioWorkletNode，在独立线程处理音频队列，取代当前 createBufferSource 方式。环形缓冲避免音频中断。

### Task 18: 输入合并 + 键位优化

**Files:** Modify `src/App.tsx`, `src/hooks/useInput.ts`

键盘 + 手柄输入统一合并为单一 controllerState，避免重复发送。允许通过 UI 自定义键位映射。
