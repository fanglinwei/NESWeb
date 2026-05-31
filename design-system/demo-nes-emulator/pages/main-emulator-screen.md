# Main Emulator Screen Override

> Overrides `design-system/demo-nes-emulator/MASTER.md` for the primary play surface.

## Intent

Create an immersive, low-distraction NES play screen that prioritizes the game canvas, stable input, and quick access to essential actions.

## Layout

- Center the game canvas as the visual anchor.
- Preserve the NES aspect ratio; never stretch or crop gameplay.
- Use a dark arcade-cabinet frame around the canvas for tactile depth.
- Keep secondary UI outside the gameplay safe area.
- On small screens, stack status/header content above the canvas and controls below it.
- On desktop/tablet, allow a wider stage with controls floating near the lower edge.

## Visual Treatment

- Use `--color-background` as the page base.
- Use subtle radial glow behind the canvas using primary/secondary colors at low opacity.
- Canvas frame should feel tactile: dark surface, inner border, modest shadow.
- Avoid heavy 3D/WebGL decoration that competes with gameplay.
- Use pixel typography sparingly for titles/status; prioritize readability for labels.

## Interaction Rules

- Gameplay controls must remain reachable without covering critical canvas content.
- All interactive controls need visible focus rings using `--color-ring`.
- Touch targets must be at least 44×44px.
- Keyboard control hints should be discoverable but not persistent noise.
- Loading, paused, and error states must appear directly over or near the canvas with clear recovery actions.

## Motion

- Use only transform/opacity transitions, 150–250ms.
- Respect `prefers-reduced-motion`; disable glow pulsing, parallax, and decorative movement.
- Do not animate canvas size while a game is running.

## Accessibility Checklist

- Canvas has an accessible label describing the currently loaded game/emulator surface.
- Pause/resume/reset/load controls are reachable by keyboard.
- Status changes such as paused, loaded, or error are announced via polite live region.
- No meaning is conveyed by color alone; pair status colors with text.
