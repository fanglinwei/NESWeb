# Floating Controls Override

> Overrides `design-system/demo-nes-emulator/MASTER.md` for the floating emulator controls component.

## Intent

Provide compact, tactile controls that feel gamepad-inspired while remaining accessible, responsive, and unobtrusive.

## Layout

- Group related actions: playback/game actions, file/save actions, and settings/debug actions.
- Keep the component anchored but avoid covering the center of the game canvas.
- On mobile, position controls within safe areas and allow wrapping into two rows if needed.
- Maintain at least 8px gap between touch targets.
- Prefer a pill/toolbar container with clear grouping dividers over scattered buttons.

## Visual Treatment

- Use a dark translucent surface with a visible border: `--color-border`.
- Add subtle tactile depth with `--shadow-lg`, inner highlight, and 1px border.
- Primary action uses `--color-accent`.
- Destructive/reset action uses `--color-destructive` and must be visually separated.
- Icons must be SVG/vector from one consistent set; no emoji controls.

## Button Specs

- Minimum interactive size: 44×44px.
- Icon-only buttons require `aria-label` and visible tooltip/help text on hover/focus where appropriate.
- Use pressed/active states via opacity, background, or inset shadow; avoid layout-shifting transforms.
- Disabled buttons must use semantic `disabled`, reduced opacity, and no pointer action.

## Motion

- Hover/focus/press transitions: 150–200ms.
- Prefer `transform: translateY(-1px)` only when it does not cause neighboring layout shift.
- Use `prefers-reduced-motion` to remove decorative lift/slide effects.

## Accessibility Checklist

- Every icon-only control has an accessible name.
- Keyboard tab order matches visual order.
- Focus ring is high contrast and not clipped by the toolbar container.
- Current states such as paused/muted/recording are exposed via `aria-pressed` or equivalent state text.
