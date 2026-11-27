# ANTI-AI-SLOP DESIGN & PRODUCT GUARDRAILS

## Absolute Prohibitions
1. NO glassmorphism, heavy `backdrop-blur`, faux-neon glow, rainbow borders, or blurred gradient blobs.
2. NO ubiquitous green pill buttons or success badges across non-success states.
3. NO generic purple/indigo hero backgrounds or crypto SaaS marketing templates.
4. NO fake metrics (e.g., "10,000+ happy students"), placeholder charts, or decorative card spam.
5. NO `transition: all` — animate only `transform` and `opacity` (150ms–250ms).
6. NO horizontal scrolling — enforce `overflow-x: clip` on root layout.
7. NO floating placeholder-only form fields — labels must be visible and accessible.

## Mandated Principles
1. **Hue Token System:** Zero hardcoded hex codes in component styling. Derive everything from CSS variables (`--bg-surface`, `--text-primary`, `--border-subtle`, `--accent-primary`).
2. **Interface Density:** 4px/8px spatial rhythm. Calculated micro-elevation with 1px border contrast instead of blurry drop shadows.
3. **Better Typography:** Tabular numbers (`tabular-nums`) for currency, ranks, application IDs, and marks. Unitless line-heights.
4. **Accessible Forms:** High-contrast focus rings, touch targets >= 44px, and mobile input font size >= 16px to prevent iOS auto-zoom.
