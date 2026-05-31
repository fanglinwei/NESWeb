# Settings Modal Override

> Overrides `design-system/demo-nes-emulator/MASTER.md` for settings, dialogs, and overlay sheets.

## Intent

Make configuration feel clear and reversible, with strong modal legibility over the immersive game background.

## Layout

- Use a centered modal on desktop and a bottom sheet/full-height sheet on small screens.
- Keep max width around 520–640px for readable settings groups.
- Group settings into clear sections: Video, Audio, Controls, Save/Data, Advanced.
- Place primary action on the right/end; secondary/cancel action on the left/start.
- Destructive actions such as clearing saves must be separated into a danger zone.

## Visual Treatment

- Modal surface should use a dark elevated color, not pure white, to match the emulator theme.
- Scrim opacity should be strong enough for legibility: 40–60% black.
- Use `--color-border` for section dividers and input boundaries.
- Use pixel accents for headings, but normal readable text for descriptions and form labels.

## Forms & Feedback

- Every input/control has a visible label.
- Provide helper text for technical settings such as scaling, color mode, audio buffer, or key bindings.
- Validate after blur or submit, not on every keystroke.
- Show errors near the relevant field and include a recovery path.
- Confirm destructive actions and offer undo where possible.

## Interaction Rules

- Opening the modal moves focus to the dialog title or first control.
- Closing restores focus to the triggering control.
- Escape closes non-destructive dialogs unless unsaved changes exist.
- Unsaved changes require confirmation before dismissing.
- Modal content must scroll internally only when needed, without trapping fixed action buttons off-screen.

## Accessibility Checklist

- Use semantic dialog role/attributes and an accessible title.
- Maintain keyboard trap while open.
- All fields expose labels, descriptions, errors, and disabled states semantically.
- Toasts/status feedback use `aria-live="polite"` and do not steal focus.
