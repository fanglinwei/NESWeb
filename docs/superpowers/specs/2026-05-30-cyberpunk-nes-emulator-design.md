# Cyberpunk NES Emulator — Full UI Redesign

**Date**: 2026-05-30
**Status**: Approved
**Scope**: Full emulator UI redesign (CSS-first overhaul)

## Design Direction

| Decision | Choice |
|----------|--------|
| Aesthetic | Neon Synthwave |
| Intensity | Full Maximalist |
| Palette | Cyberpunk (Cool Neon) |
| Typography | Orbitron 900 (display) + Rajdhani 600 (labels) + Share Tech Mono (HUD/data) |
| Approach | CSS-First Overhaul — keep component structure stable, rewrite all CSS |

## Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| Background | `#050D18` | Deep void — page base, modal scrim |
| Surface | `#0A1530` | Elevated cards, modal bg, toolbar |
| Primary | `#00CCFF` | Cyan neon — primary actions, headings, focus rings |
| Secondary | `#CC00FF` | Purple neon — secondary accents, hover glows |
| Accent | `#00FF88` | Matrix green — success state, FPS/status data |
| Destructive | `#FF3366` | Hot pink — reset, delete, danger zone |
| Warning | `#FFCC00` | Electric yellow — pause state, warnings |
| Text Primary | `#FFFFFF` | Main content text |
| Text Muted | `rgba(255,255,255,0.55)` | Secondary text, descriptions |
| Border | `rgba(0,200,255,0.08)` | Subtle dividers |
| Border Strong | `rgba(0,200,255,0.20)` | Visible borders, input edges |

## Typography

- **Display/Headings**: Orbitron 900, letter-spacing: 3-4px, cyan glow text-shadow
- **UI Labels/Actions**: Rajdhani 600, letter-spacing: 1-2px
- **HUD/Data/Status**: Share Tech Mono, green tint for system data
- **Google Fonts import**: `Orbitron:wght@900` + `Rajdhani:wght@600;700` + `Share Tech Mono`

## Design Tokens

- Spacing scale: `4px / 8px / 16px / 24px / 32px / 48px`
- Border radius: `4px` (inputs/small), `8px` (cards/canvas), `999px` (pills/toolbar)
- Shadows: Layered — subtle inner highlight + dark drop + color glow
- Transitions: 150-200ms for micro-interactions, 200-300ms for state changes

## Signature Effects

1. **Neon Glow** — `box-shadow` layers on primary elements, intensity increases on hover
2. **Grid Lines** — Static CSS background on body: horizontal lines at low opacity for atmosphere
3. **Glass Surface** — Semi-transparent dark bg + subtle border + backdrop-blur on overlays
4. **CRT Scanlines** — Optional overlay on game canvas: repeating horizontal dark lines
5. **Glow Pulse** — Canvas frame glow breathes on a 4s CSS animation cycle
6. **Status Ticker** — Bottom bar with terminal-style scrolling system messages

## Layout Architecture

### App Shell (persistent)
- Top: NES_PLAYER header bar with diamond/caret decoration, cyan glow
- Center: Content area — state-dependent (idle / game / settings)
- Bottom: Status ticker in Share Tech Mono, green tint
- Full-viewport background with grid lines + subtle radial glow

### State 1: Idle (ROM Drop Zone)
- Centered card with dashed cyan border
- Title in Orbitron 900 with glow
- Drop zone area with "READY FOR INPUT..." prompt
- Two action buttons: SELECT FILE (green accent) + RECENT ROMS (ghost)
- Recent ROMs list below with hover glows
- Subtle radial glow centered behind the card

### State 2: Game (Playing Surface)
- Canvas area with neon-bordered frame + CRT scanline overlay
- HUD bar above/below canvas: FPS counter, ROM name, status indicator
- Floating Controls toolbar: pill-shaped, glass surface, grouped buttons
  - Group 1 (Playback): Pause/Resume, Reset
  - Group 2 (Save): Save State
  - Group 3 (System): Fullscreen, Settings
  - Groups separated by thin vertical dividers
- Notification toast: slides in from top-right, auto-dismisses
- Mobile: grid layout with canvas top, controls bottom in a glass tray

### State 3: Settings Modal
- Dark scrim overlay (50% black)
- Centered modal card: elevated glass surface with cyan border
- Settings grouped into sections with section dividers
- Each row: label + current value, hover highlight
- Danger zone separated at bottom: RESET_DATA in pink
- Close button + Escape key support
- Focus trap while open

## Component Changes

### `index.css`
- Full rewrite: new design tokens, font imports, global reset
- Body: grid background, radial glow, new font defaults
- New utility classes: `.neon-text`, `.glass-surface`, `.cyber-border`
- Remove old `--pink`, `--orange`, `--blue` backward-compat aliases

### `App.css`
- Full rewrite: cyberpunk shell styling
- App shell with header, content area, status ticker
- Idle state: cyberpunk drop zone card
- Game state: canvas frame + HUD bar
- Mobile responsive with grid layout
- Remove old `.soft-card`, `.soft-button` classes

### `GameCanvas.css`
- Canvas frame: dark surface, cyan inner border, outer glow
- CRT scanline overlay via `::after` pseudo-element
- Drop zone overlay for ROM swapping during gameplay
- Loading shimmer effect

### `FloatingControls.css`
- Pill toolbar: glass surface, cyan border, grouped layout
- Icon buttons: circular, neon glow on hover
- Active/pressed states with inset glow
- Desktop: floating pill toolbar centered below canvas
- Mobile portrait: toolbar integrated into bottom tray above home indicator
- Mobile landscape: toolbar miniaturized to 20pt icons in right panel, above A/B buttons

### New: `TouchGamepad.css` + `TouchGamepad.tsx`
- Only rendered on mobile (touch-capable devices)
- **D-pad**: 3×3 CSS grid, 48pt cells (portrait) / 44pt cells (landscape)
  - Active direction cell: cyan glow background + border highlight
  - Inactive cells: subtle glass surface
  - Arrow indicators (◄ ▲ ▼ ►) in each direction cell
- **A/B action buttons**: 48pt diameter circles in diagonal NES layout
  - B button: hot pink `#FF3366`, upper-right diagonal offset
  - A button: cyan `#00CCFF`, lower-left diagonal offset
  - Orbitron 900 letter label centered in each button
  - 2px colored neon border + layered box-shadow glow
  - Pressed state: inner glow intensifies, slight scale-down (0.95)
- **Connects to existing touch input system** via the same NES input event stream
- Hidden on desktop; detection via `matchMedia('(pointer: coarse)')` or `ontouchstart`

### `FPSDisplay.css`
- HUD-style: Share Tech Mono, green tint
- Subtle background pill, positioned top-right in game state
- Pulsing dot indicator for running state

### `NotificationToast.css`
- Slides in from top-right with glow
- Dark glass surface with cyan left border
- Auto-dismiss progress bar
- Status-based color coding (success=green, error=pink, warning=yellow)

### New: `SettingsModal.css` + `SettingsModal.tsx`
- Dialog with `role="dialog"`, focus trap, Escape to close
- Settings groups: Video, Audio, Controls, Data
- Toggle switches for boolean settings
- Select/dropdown for enumerated settings
- Danger zone with confirmation step

## Motion Design

### Page Load Sequence
1. `0ms`: Shell background + grid lines appear (instant)
2. `100ms`: Header glitch-draws in (text-shadow animates from 0 to full glow)
3. `200ms`: Content area rises up 8px + fades in
4. `400ms`: Status ticker types out character by character

### Micro-Interactions (150-200ms ease-out)
- Buttons: glow intensifies + border brightens + translateY(-1px)
- Cards: border glow pulses + background lightens subtly
- Icons: color shift to cyan + glow ring appears

### State Transitions (200-300ms)
- Idle → Game: Drop zone dissolves, canvas scales in with glow burst
- Game → Paused: Canvas dims + scanline freeze overlay
- Modal open: Scrim fades in, modal scales from 95% to 100% with glow
- Notification: Slides in from right, auto-fades after 3s

### Ambient Effects
- Grid lines: Static CSS, no animation cost
- Canvas glow pulse: 4s CSS animation, stops on `prefers-reduced-motion`
- Status ticker: CSS marquee-style scroll on bottom bar text

## Mobile Design — iPhone 17 Baseline

### Device Specifications

| Metric | Value |
|--------|-------|
| Device | iPhone 17 (6.3" OLED) |
| Resolution (physical) | 2622 × 1206 px |
| CSS Viewport (portrait) | 402 × 874 pt |
| CSS Viewport (landscape) | 874 × 402 pt |
| Device Pixel Ratio | 3x |
| Safe Area Top (Dynamic Island) | 59 pt |
| Safe Area Bottom (Home Indicator) | 34 pt |
| Minimum Touch Target | 48 pt (exceeds Apple's 44pt minimum) |

### Breakpoint Strategy

- **Mobile Portrait**: `max-width: 428px` (covers iPhone 17 and smaller)
- **Mobile Landscape**: `max-height: 430px` (detects landscape orientation)
- **Tablet/Desktop**: everything above — default desktop layout applies

### Portrait Layout (402×874pt)

#### Idle Screen
```
┌──────────────────────┐
│    Dynamic Island    │  59pt safe top
├──────────────────────┤
│                      │
│     🖥️ (emoji)       │
│   NES_PLAYER         │  Orbitron 900, centered
│   DROP .NES // INIT  │  Rajdhani subtitle
│                      │
│  ┌────────────────┐  │
│  │  dashed border  │  │  Drop zone
│  │  TAP TO SELECT  │  │
│  └────────────────┘  │
│                      │
│  ◆ SELECT FILE ◆    │  48pt tall, full width - 32px margin
│    RECENT ROMS ↓     │  44pt tall, ghost style
│                      │
│  [recent ROM list]   │  scrollable, max 3 items visible
│                      │
├──────────────────────┤
│   Home Indicator     │  34pt safe bottom
└──────────────────────┘
```

- All content vertically centered, within thumb reach
- Buttons: 48pt minimum height, full-width with 16px horizontal margin
- Drop zone: dashed border expands to fill available width
- Recent ROMs: limited to 3 visible rows, scrollable

#### Game Screen
```
┌──────────────────────┐
│    Dynamic Island    │  59pt safe top
├──────────────────────┤
│ FPS:60  MARIO.nes  ▶│  HUD bar, 24pt, Share Tech Mono
├──────────────────────┤
│                      │
│   ┌──────────────┐   │
│   │              │   │
│   │  GAME CANVAS │   │  256:240 aspect, fills available width
│   │  + scanlines │   │  16px horizontal margin
│   │              │   │
│   └──────────────┘   │
│                      │
├──────────────────────┤
│  ◄  ▲  ▼  ►     Ⓑ Ⓐ │  Touch gamepad rows
│                      │  48pt D-pad cells, 48pt action circles
├──────────────────────┤
│  ⏯  💾  ↺  ⛶  ⚙   │  Toolbar pill, 36pt icons
├──────────────────────┤
│   Home Indicator     │  34pt safe bottom
└──────────────────────┘
```

- **Grid layout**: `grid-template-rows: auto 1fr auto auto` — HUD / Canvas / Gamepad / Toolbar
- **Canvas**: fills available space maintaining 256:240 aspect ratio, 16px horizontal padding
- **Touch gamepad**: 
  - D-pad on the left: 3×3 grid, 48pt cells, arrow indicators for active directions
  - Action buttons (A/B) on the right: 48pt diameter circles in diagonal NES layout
    - B button (hot pink `#FF3366`): upper-right position
    - A button (cyan `#00CCFF`): lower-left position
    - Both: 2px neon border + box-shadow glow, Orbitron letter label inside
- **Toolbar pill**: centered at bottom, 36pt circular icon buttons, glass surface, group dividers

### Landscape Layout (874×402pt)

```
┌──────────────────────────────────────────────────────────────────┐
│                         Dynamic Island                           │
├──────────┬─────────────────────────────────┬────────────────────┤
│          │                                 │  ⏯  💾           │ mini toolbar
│  D-Pad   │         GAME CANVAS             │                    │
│          │         256:240 aspect          │    Ⓑ              │ B: 48pt pink
│  ◄ ▲ ▼ ► │         + scanlines             │                    │
│          │                                 │      Ⓐ            │ A: 48pt cyan
│          │                                 │                    │
│          │                                 │  FPS:60            │ status
├──────────┴─────────────────────────────────┴────────────────────┤
│                       Home Indicator                             │
└──────────────────────────────────────────────────────────────────┘
```

- **Three-column grid**: `grid-template-columns: auto 1fr auto`
  - Left: D-pad (3×3 grid, 44pt cells)
  - Center: Canvas (fills height and available width, maintains aspect ratio)
  - Right: Action panel — **A/B buttons are the focal point**
- **Right panel layout** (flex column, centered):
  - Top: Mini toolbar (20pt icons: pause ⏯, save 💾) — reduced glow, don't compete
  - **Center**: A/B buttons — 48pt diameter, diagonal NES layout
    - B (pink `#FF3366`): upper position, right offset
    - A (cyan `#00CCFF`): lower position, left offset
    - Both: 2px neon border, strong box-shadow glow, Orbitron 900 letter
  - Bottom: FPS readout in Share Tech Mono green
- **Design principle**: A/B buttons are the largest, most visually dominant elements in the right panel. Mini toolbar and FPS are deliberately understated to avoid competing for attention.

### Touch Target Sizing (iPhone 17 Baseline)

| Element | Portrait | Landscape | Notes |
|---------|----------|-----------|-------|
| D-pad cells | 48×48pt | 44×44pt | Slightly smaller in landscape due to height constraint |
| A/B action buttons | 48pt Ø | 48pt Ø | Largest interactive elements — always 48pt |
| Toolbar icons | 36pt Ø | 20pt Ø | Portrait: generous. Landscape: minimal, don't distract from A/B |
| File/ROM buttons | 48pt min height | — | Full-width in portrait |
| ROM list rows | 44pt min height | — | Comfortable tap targets |
| Settings rows | 44pt min height | 44pt min height | Consistent across orientations |

### Safe Area Handling

- Use `env(safe-area-inset-*)` CSS env variables for all screen edges
- Dynamic Island (top): 59pt — header content padded below
- Home Indicator (bottom): 34pt — toolbar and controls padded above
- Game canvas never extends into unsafe areas
- Touch gamepad and toolbar fully within safe zone

### Thumb Zone Considerations

- **Portrait**: Primary actions (SELECT FILE, gamepad, toolbar) in the bottom 60% of screen — natural thumb reach
- **Landscape**: D-pad and A/B buttons positioned on the outer edges — thumbs naturally rest there when holding phone horizontally
- Settings modal: centered on screen, reachable from both thumbs

## Accessibility

- All icon-only buttons have `aria-label`
- Focus rings: high-contrast cyan outline, visible on all interactive elements
- Modal: semantic `<dialog>`, focus trap, Escape to close, focus restoration
- State changes announced via `aria-live="polite"` region
- `prefers-reduced-motion`: disables glow pulse, ticker scroll, decorative animations
- Touch targets: minimum 48pt on mobile (exceeds Apple's 44pt minimum)
- Color never used alone to convey meaning; always paired with text/icon
- Minimum 4.5:1 contrast for all body text

## Technical Constraints

- **Do NOT touch**: emulator core logic, Web Worker, input handling hooks, Zustand store
- **CSS-only where possible**: grid lines, scanlines, glow pulses — no JS animation overhead
- **No new dependencies**: use existing React 19 + Zustand, no additional animation libraries
- **Mobile**: support portrait (canvas top, controls bottom) and landscape (controls on sides)
- **ROM loading**: drag-and-drop + file picker must continue to work
- **Gamepad/keyboard input**: must remain fully functional
