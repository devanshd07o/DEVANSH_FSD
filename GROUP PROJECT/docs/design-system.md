# Design System & Anti-AI-Slop Architecture

## 1. Aesthetic Thesis: Calm, Authoritative Academic Operations
The Admission Portal rejects generic AI SaaS templates, ubiquitous neon green pill buttons, floating glass cards, and purple hero gradients. Instead, it embodies a distinguished Indian institutional look:
- Primary Brand Navy (`#1B365D`) reflecting trust, authority, and official academic stature.
- Crisp 1px border contrast (`#E2E8F0`) with calculated micro-elevation rather than muddy blurred shadows.
- Unitless typographic rhythm (Inter font, line-height 1.45–1.6, tabular numerals `font-variant-numeric: tabular-nums` for all scores, dates, application IDs, and currency amounts).

## 2. Tokenized Color Scale
```css
:root {
  --background: #F8FAFC;
  --surface: #FFFFFF;
  --surface-subtle: #F1F5F9;
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-muted: #64748B;
  --border: #E2E8F0;
  --border-strong: #CBD5E1;
  --accent: #1B365D;          /* Indian Academic Navy */
  --accent-hover: #12243E;
  --accent-subtle: #EBF1F8;
  --success: #15803D;
  --success-bg: #F0FDF4;
  --warning: #B45309;
  --warning-bg: #FFFBEB;
  --danger: #B91C1C;
  --danger-bg: #FEF2F2;
  --info: #0369A1;
  --info-bg: #F0F9FF;
}
```

## 3. Operational Density & Accessibility Rules
1. **WCAG 2.2 AA Contrast**: All body text achieves >= 4.5:1 contrast against background surfaces.
2. **Touch Targets**: All primary interactive buttons maintain minimum 44px hit areas on mobile devices.
3. **Mobile Form Zoom Prevention**: All text inputs maintain computed `font-size >= 16px` on mobile viewports to prevent iOS auto-zoom traps.
4. **Horizontal Scroll Ban**: Root body layout enforces `overflow-x: clip`.
5. **Animation Discipline**: `transition: all` is strictly banned; only `transform` and `opacity` transition within 150ms.
