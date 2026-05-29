# NES Web 模拟器 — 产品设计文档

**日期：** 2026-05-30
**状态：** 设计中

---

## 一、产品概述

一个基于 Web 技术的 NES（红白机）模拟器，支持在 PC 和移动设备上运行 `.nes` ROM 文件。UI 采用二次元软萌像素可爱风格。

**定位：** 个人学习项目，深入学习前端工程、WASM、Web Worker 架构、WebRTC 联机等技术。

---

## 二、技术栈

| 层级 | 技术选型 | 理由 |
|------|---------|------|
| 前端框架 | React 18 + TypeScript | 组件化 UI，类型安全 |
| 构建工具 | Vite | 快速开发，WASM 支持好 |
| 状态管理 | Zustand | 轻量，无 boilerplate |
| 模拟核心 | nes-rust 编译为 WASM | 性能最好，帧率稳定 |
| 核心运行环境 | Web Worker | 模拟不阻塞 UI 线程 |
| 网络联机 | WebRTC P2P + 轻量 WebSocket 信令服务器 | 低延迟输入同步 |
| 本地存储 | IndexedDB | ROM 持久化 + 存档管理 |
| 样式方案 | CSS Modules + CSS Variables | 轻量，无额外依赖 |

---

## 三、整体架构

```
┌─────────────────── 主线程 (UI Layer) ───────────────────┐
│                                                           │
│  React App                                                │
│  ├── 沉浸式布局外壳 (全屏画布 + 浮动控制栏)              │
│  ├── Canvas 渲染器 (接收 Worker 传来的帧数据)            │
│  ├── Web Audio 输出 (接收 Worker 传来的音频流)            │
│  ├── 输入捕获层 (键盘 + Gamepad API + 虚拟手柄)          │
│  ├── ROM 管理器 (IndexedDB 存储 + 文件拖放)               │
│  └── 存档/滤镜/设置面板 (浮动呼出)                        │
│                                                           │
│         ↕ postMessage (结构化协议)                        │
│                                                           │
├─────────────── Web Worker (Emulation Core) ──────────────┤
│                                                           │
│  WASM Module (nes-rust 编译)                              │
│  ├── CPU / PPU / APU 模拟                                 │
│  ├── Mapper 支持                                          │
│  ├── 逐帧输出 → transferable ArrayBuffer                  │
│  └── 存档状态序列化                                       │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**核心原则：**
- Worker 只管模拟 — 传入按键状态，传出帧+音频
- 主线程只管呈现 — 拿帧渲染到 Canvas，拿音频喂 Web Audio
- 双方通过结构化消息协议通信，帧数据用 transferable 传输避免拷贝

---

## 四、组件树

```
App
├── GameCanvas              ← 全屏 Canvas，渲染帧
│   └── CRTFilter           ← 可选画面滤镜层
│
├── FloatingControls        ← 浮动控制栏（自动淡出）
│   ├── PlayPauseButton
│   ├── SaveStateButton
│   ├── LoadStateButton
│   ├── FullscreenToggle
│   └── SettingsTrigger
│
├── VirtualGamepad           ← 仅移动端渲染，PC 端隐藏
│   ├── DPad (十字方向键)
│   └── ActionButtons (A/B + Select/Start)
│
├── ROMLibrary               ← ROM 管理面板（滑入式）
│   ├── ROMList (封面+名称列表)
│   ├── ROMUpload (拖放/选择文件)
│   └── RecentPlayed
│
├── SettingsPanel            ← 设置面板（滑入式）
│   ├── KeyMapping           ← 键盘映射配置
│   ├── GamepadSettings      ← 手柄灵敏度
│   ├── FilterSettings       ← 滤镜选择（CRT/扫描线/原画）
│   └── VirtualGamepadSettings ← 手柄透明度/大小
│
├── MultiplayerPanel         ← 联机面板
│   ├── CreateRoom (生成4位房间码)
│   ├── JoinRoom (输入房间码)
│   └── ConnectionStatus
│
└── NotificationToast        ← 全局提示（存档成功等）
```

### Zustand Store

```
Store
├── emulation: { running, fps, frameCount }
├── rom: { currentROM, library[], recent[] }
├── saveStates: Map<romId, SaveState[]>
├── input: { keyMapping, gamepadConfig }
├── settings: { filter, volume, vGamepadOpacity, vGamepadSize }
├── multiplayer: { role, roomCode, peerConnected }
└── ui: { activePanel, notification }
```

---

## 五、Worker 通信协议

```typescript
// ─── 主线程 → Worker ───
type MainToWorker =
  | { type: 'LOAD_ROM'; rom: ArrayBuffer }
  | { type: 'INPUT'; controller1: u8; controller2: u8 }
  | { type: 'SAVE_STATE'; slot: number }
  | { type: 'LOAD_STATE'; data: ArrayBuffer }
  | { type: 'RESET' }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'PAUSE' } | { type: 'RESUME' }

// ─── Worker → 主线程 ───
type WorkerToMain =
  | { type: 'ROM_LOADED'; info: { mapper: number; prgRom: number; chrRom: number } }
  | { type: 'ROM_ERROR'; error: string }
  | { type: 'FRAME'; video: Uint8ClampedArray; audio: Float32Array }
  | { type: 'STATE_SAVED'; slot: number; data: ArrayBuffer }
  | { type: 'STATE_LOADED'; ok: true }
  | { type: 'ERROR'; error: string }
```

**关键设计决策：**
- 帧数据用 transferable 传递：`postMessage(msg, [video.buffer, audio.buffer])`
- 输入用紧凑位掩码（1 byte per controller）
- 音频 Float32Array 直接喂 AudioWorklet

---

## 六、核心数据流

### ROM 加载
```
用户拖放/选择 .nes 文件
  → FileReader.readAsArrayBuffer()
  → IndexedDB 存储
  → 解析 NES header（PRG/CHR/Mapper）
  → postMessage { type: 'LOAD_ROM', rom } → Worker
  → Worker: WASM 初始化，加载 ROM
  → Worker: postMessage { type: 'ROM_LOADED', info }
  → UI: 更新状态，自动开始运行
```

### 逐帧循环
```
主线程 rAF 循环 (~60fps):
  1. 收集输入（键盘/手柄/虚拟手柄）
  2. postMessage { type: 'INPUT', controller1, controller2 } → Worker
  3. Worker: WASM 运行一帧，产出 framebuffer + audioSamples
  4. Worker: postMessage { type: 'FRAME', video, audio } → 主线程
  5. 主线程: Canvas.putImageData(framebuffer)
  6. 主线程: AudioContext 写入 audioSamples
```

### 存档/读档
```
存档：
  用户点击存档槽 → postMessage { type: 'SAVE_STATE', slot } → Worker
  → Worker: WASM 序列化状态 → ArrayBuffer
  → postMessage { type: 'STATE_SAVED', slot, data }
  → 主线程: 存入 IndexedDB + 生成缩略图

读档：
  用户选择存档 → IndexedDB 读取
  → postMessage { type: 'LOAD_STATE', data } → Worker
  → Worker: WASM 反序列化恢复
  → postMessage { type: 'STATE_LOADED' }
```

### 联机（输入同步）
```
主机创建房间：
  生成 4 位房间码 → 连接信令服务器（WebSocket）
  
客机加入：
  输入房间码 → 信令服务器交换 SDP/ICE
  → WebRTC DataChannel 建立 P2P 连接
  → ROM 哈希校验（不一致则主机自动发送 ROM）
  → 同步启动：双方各自运行 WASM，仅交换控制器输入
  → 帧延迟缓冲（2-3 帧）抵消网络抖动
```

---

## 七、跨设备适配

### PC 端
- 全屏画布 + 浮动控制栏（自动淡出）
- 键盘映射：默认方向键 + Z/X（A/B）
- 支持 USB/蓝牙手柄（Gamepad API）
- 拖放 .nes 文件直接加载

### 移动端
- 上半画面 + 下半虚拟手柄
- 十字键 D-Pad（十字排列，单拇指覆盖四个方向）
- A/B 按钮（B 左 A 右，还原 NES 原版布局）
- Select/Start 居中放置不干扰主操作区
- 虚拟手柄支持透明度/大小调节
- 横竖屏自动适配（ResizeObserver）

### 自适应策略
- `navigator.maxTouchPoints` + 屏幕宽度判断设备类型
- 同一套 React 组件，CSS 媒体查询切换布局
- 移动端中低性能设备自动跳过后处理（CRT 滤镜等）

---

## 八、UI 风格规范

**方向：软萌像素风（二次元可爱像素）**

| 属性 | 规范 |
|------|------|
| 主色调 | `#ff6699`（少女粉）、`#ff9966`（奶油橙）、`#66aaff`（天空蓝） |
| 背景色 | `#fff5f8`（浅粉底）、`#fff`（卡片白） |
| 边框 | `3px solid` 柔和色，圆角 `16-20px` |
| 按钮 | 圆角药丸形，带 `box-shadow` 偏移（贴纸风格） |
| 卡片 | 柔和底色 + 粗彩色边框 + 圆角 + 偏移阴影 |
| 字体 | 系统圆体 + 像素等宽字体（代码/提示区） |
| 装饰元素 | ♡ ★ ♪ 符号点缀 |
| 浮动栏 | 半透明毛玻璃底 + 圆角药丸按钮 |
| 存档槽 | 虚线边框卡片，空心/实心爱心表示空/满 |

---

## 九、错误处理

| 场景 | 处理方式 |
|------|----------|
| ROM 格式非法 | Worker 返回 `ROM_ERROR`，Toast 提示"无效的 ROM 文件" |
| 不支持的 Mapper | UI 提示"不支持此游戏的芯片(Mapper XX)" |
| WASM 加载失败 | 显示"模拟核心加载失败，请刷新页面" + 重试按钮 |
| 音频上下文被阻止 | 首次用户交互后自动 resume AudioContext |
| IndexedDB 不可用 | 降级内存模式，功能提示 |
| 移动端横竖屏切换 | ResizeObserver 等比缩放 Canvas |
| 帧率不足（<50fps） | 跳过 CRT 滤镜等后处理维持流畅 |
| 联机掉线 | DataChannel 心跳检测，断开提示 + 重连 |
| 联机 ROM 不匹配 | 主机自动传 ROM 给客机 |

---

## 十、功能范围

### Phase 1 — 核心骨架（目标：能跑 Mario）
- Vite + React + TypeScript 项目搭建
- Web Worker + WASM 加载管线
- Canvas 渲染 + 键盘输入映射
- 基础浮动控制栏

### Phase 2 — 流畅体验
- 音频输出（AudioWorklet）
- 存档/读档（IndexedDB）
- Gamepad API 支持
- 全屏模式

### Phase 3 — 移动端适配
- 虚拟十字键手柄
- 横竖屏自适应布局
- 触摸输入与键盘统一映射
- 中低端手机性能优化

### Phase 4 — ROM 管理 + 增强
- ROM 库（IndexedDB 存储、列表、封面）
- 最近游玩 + 拖放上传
- CRT 滤镜 / 扫描线效果
- 自定义键位映射面板

### Phase 5 — 打磨发布
- 性能检测与自动降级策略
- PWA 离线支持
- 错误边界与友好提示
- 移动端手柄大小/透明度自定义

### Phase 6 — 联机（Bonus）
- WebSocket 信令服务器
- WebRTC P2P 连接
- 输入同步 + 帧延迟缓冲
- ROM 自动同步
- 房间码创建/加入

---

## 十一、排除项（YAGNI）

- 不支持除 NES 外的主机模拟（SNES/GB 等）
- 不支持在线 ROM 商店/社区
- 不支持录像回放（replay）
- 不支持金手指（Cheat Code）
- 不支持云存档同步（本地 IndexedDB 即可）
- 不自建 STUN/TURN 中继服务（依赖现有公共服务）
- 不实现排行榜/社交功能

---

## 十二、信令服务器设计

联机所需的最简信令服务器（独立轻量部署）：

**技术：** Node.js + `ws` 库，单文件 ~50 行

**职责：**
1. 接收房间创建请求，分配 4 位房间码
2. 转发 WebRTC SDP offer/answer 和 ICE candidate
3. 房间码过期清理（5 分钟无活动）

**不需要：**
- 数据库 — 房间信息存内存
- 认证 — 纯房间码机制
- 消息持久化

---

## 附录：关键依赖预览

```json
{
  "dependencies": {
    "react": "^19.x",
    "react-dom": "^19.x",
    "zustand": "^5.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^6.x",
    "vite-plugin-wasm": "用于 WASM 加载"
  }
}
```

信令服务器（独立目录）：
```json
{
  "dependencies": {
    "ws": "^8.x"
  }
}
```
