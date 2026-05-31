# Floating Controls Override

> Overrides `design-system/demo-nes-emulator/MASTER.md` for the floating emulator controls component.

## Intent

Provide compact, tactile controls that feel gamepad-inspired while remaining accessible, responsive, and unobtrusive. The control layer should support fast emulator actions without covering the center of the game canvas.

## Current Implementation Target

This document reflects the updated `src/components/FloatingControls.tsx` and `src/components/FloatingControls.css` implementation:

- Toolbar-only component; touch gameplay input lives in `TouchGamepad`.
- Icon-only controls use inline SVG/vector icons from one visual style.
- Controls are grouped as playback/game actions, file/save actions, and system/settings actions.
- The toolbar can be previewed in `design-system/demo-nes-emulator/pages/floating-controls-preview.html`.

## Layout

- Use one pill/toolbar container rather than scattered floating buttons.
- Group related actions in visual order:
  - Playback/game: pause or resume, then reset.
  - File/save: save state.
  - System: fullscreen and settings.
- Separate groups with thin dividers using `--color-border`.
- Keep the destructive reset action inside the playback group but add extra spacing and danger styling so it is visually distinct.
- Keep the component anchored below or near the lower edge of the emulator stage, avoiding the center of the game canvas.
- On mobile portrait, keep the toolbar centered in the lower tray and allow wrapping without horizontal scroll.
- On mobile landscape, keep the toolbar compact and within safe areas; hide hover-only tooltip bubbles to avoid crowding.
- Maintain at least 8px gap between normal touch targets. In constrained landscape, the compact variant may reduce visual chrome but must keep intentional spacing and clear states.

## Visual Treatment

- Use a dark translucent surface with visible `--color-border` border.
- Add tactile depth with `--shadow-lg`, subtle inner highlight, and a 1px border.
- Use `backdrop-filter: blur(...)` only as surface separation; do not use blur as background decoration.
- Primary emulator actions use `--color-accent`.
- Destructive/reset action uses `--color-destructive` and must be visually separated.
- Neutral system actions use muted text color by default and shift to `--color-primary` on hover/focus.
- Icons must be SVG/vector from one consistent set; no emoji controls.
- Icon sizing should be tokenized per toolbar density, such as `--control-icon-size`.

## Button Specs

- Normal interactive size: 44x44px minimum.
- Icon-only buttons require:
  - `aria-label` with the exact action name.
  - Visible tooltip/help text on hover and keyboard focus where there is room.
  - `type="button"` to avoid accidental form submission if reused inside forms.
- Current states such as Pause/Resume use `aria-pressed` or equivalent state text.
- Pressed/active states use opacity, background, or inset shadow; avoid layout-shifting transforms.
- Disabled buttons must use semantic `disabled`, reduced opacity, and no pointer action.
- Use `cursor: pointer` on clickable buttons.
- Focus rings must be high contrast and offset so they are not clipped by the pill container.

## Interaction Details

- Mouse hover and keyboard focus reveal the same tooltip treatment.
- Tap/press feedback should appear within 80-150ms.
- Hover/focus/press transitions should stay in the 150-200ms range.
- Prefer `transform: translateY(-1px)` only for hover/focus on non-pressed states and only when it does not cause neighboring layout shift.
- Active/pressed states should return to the original position and use inset shadow or opacity for tactile feedback.
- The toolbar may fade with emulator idle-control visibility, but hidden controls should not leave confusing focusable elements if fully hidden in a future implementation.

## Responsive Rules

- Desktop/tablet:
  - 44px buttons or larger.
  - Tooltips may appear above controls.
  - Container padding can increase to emphasize tactile depth.
- Mobile portrait:
  - Width should fit the viewport with a max-width around 360px.
  - Wrapping is allowed; maintain group order and dividers.
  - Place inside the lower control tray below the canvas.
- Mobile landscape:
  - Use compact control variables to prevent the toolbar from competing with the game canvas.
  - Keep the container inside `--safe-left` and `--safe-right` bounds.
  - Disable tooltip bubbles because hover is not meaningful and vertical space is tight.

## Motion

- Hover/focus/press transitions: 150-200ms.
- Use opacity, background, border-color, box-shadow, and transform only.
- Avoid animating width, height, top, left, or layout-affecting properties.
- Use `prefers-reduced-motion` to remove decorative lift and tooltip transitions.

## Accessibility Checklist

- Every icon-only control has an accessible name.
- Toolbar has an accessible group label such as `Emulator controls`.
- Button group order matches visual tab order.
- Focus ring is high contrast and not clipped by the toolbar container.
- Pause/resume state is exposed with `aria-pressed` or state-specific label text.
- Divider elements are `aria-hidden="true"`.
- Tooltips are supplemental; the button `aria-label` remains the source of truth.
- Color is not the only signal for destructive action; reset is also separated spatially and labeled.

## HTML Preview

Use the standalone preview for quick visual review:

```text
design-system/demo-nes-emulator/pages/floating-controls-preview.html
```

The preview demonstrates:

- Running state toolbar with Pause, Reset, Save, Fullscreen, and Settings.
- Paused state toolbar with Resume.
- Compact landscape toolbar.
- Hover/focus tooltip behavior.
- Reduced-motion fallback rules.
