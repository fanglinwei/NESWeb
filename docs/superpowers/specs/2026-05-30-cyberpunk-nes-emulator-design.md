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
- Mobile: full-width glass tray at bottom

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

## Accessibility

- All icon-only buttons have `aria-label`
- Focus rings: high-contrast cyan outline, visible on all interactive elements
- Modal: semantic `<dialog>`, focus trap, Escape to close, focus restoration
- State changes announced via `aria-live="polite"` region
- `prefers-reduced-motion`: disables glow pulse, ticker scroll, decorative animations
- Touch targets: minimum 44×44px
- Color never used alone to convey meaning; always paired with text/icon
- Minimum 4.5:1 contrast for all body text

## Technical Constraints

- **Do NOT touch**: emulator core logic, Web Worker, input handling hooks, Zustand store
- **CSS-only where possible**: grid lines, scanlines, glow pulses — no JS animation overhead
- **No new dependencies**: use existing React 19 + Zustand, no additional animation libraries
- **Mobile**: support portrait (canvas top, controls bottom) and landscape (controls on sides)
- **ROM loading**: drag-and-drop + file picker must continue to work
- **Gamepad/keyboard input**: must remain fully functional
