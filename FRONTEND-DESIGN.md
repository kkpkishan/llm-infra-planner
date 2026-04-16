# LLM Hardware Calculator — Frontend Design Document

**Version:** 1.0
**Date:** April 16, 2026
**Scope:** Pure frontend — visual language, interaction, component system, page layouts
**Companion to:** `SPECIFICATION.md` (the engineering build spec)
**Target stack:** React 18 + Vite + TypeScript + Tailwind CSS 3 + shadcn/ui

---

## Table of Contents

1. [Design Philosophy & Principles](#1-design-philosophy--principles)
2. [Brand & Visual Identity](#2-brand--visual-identity)
3. [Design Tokens](#3-design-tokens)
4. [Layout System](#4-layout-system)
5. [Typography](#5-typography)
6. [Color System](#6-color-system)
7. [Iconography](#7-iconography)
8. [Elevation, Radius, Borders](#8-elevation-radius-borders)
9. [Motion & Animation](#9-motion--animation)
10. [Component Library](#10-component-library)
11. [Data Visualization](#11-data-visualization)
12. [Page Designs](#12-page-designs)
13. [Interaction Patterns](#13-interaction-patterns)
14. [Responsive Behavior](#14-responsive-behavior)
15. [Dark Mode](#15-dark-mode)
16. [Loading, Empty & Error States](#16-loading-empty--error-states)
17. [Accessibility](#17-accessibility)
18. [Copy & Voice](#18-copy--voice)
19. [Implementation Notes](#19-implementation-notes)
20. [Deliverables Checklist](#20-deliverables-checklist)

---

## 1. Design Philosophy & Principles

### 1.1 Design mood
**"A serious instrument, not a marketing page."**

The audience is developers, ML engineers, and infrastructure architects. They value:
- **Density over whitespace-theater** — they want numbers, fast.
- **Precision over personality** — no playful illustrations, no gradients-for-gradients'-sake.
- **Transparency over magic** — every output reveals its inputs and formulas.
- **Keyboard over mouse** — power users navigate by keyboard.

### 1.2 References / north stars
Reference the *feel* of:
- **Linear** — dense, keyboard-first, perfect typography
- **Vercel Dashboard** — restrained color, confident monospace
- **Radix Primitives docs** — clarity, grid discipline
- **Stripe Docs** — calm information hierarchy
- **Datadog/Grafana** — dashboards that respect experts

Avoid:
- Hero sections with giant gradients
- Illustrated mascots or 3D blobs
- Marketing-site hero copy
- Decorative animations

### 1.3 Six design principles

1. **Information first.** The calculator is the product. Every pixel earns its place by serving a calculation input, output, or explanation.
2. **One screen, zero scrolling (desktop).** On 1440+ viewports, the primary calculation must fit above the fold without scrolling.
3. **Numbers are hero.** Monospace, tabular figures, high contrast. Numbers never wrap; they truncate with a tooltip.
4. **Every output explains itself.** Click any number → formula drawer opens.
5. **Dark mode is a first-class citizen**, not an afterthought. Both themes ship day 1 and are equally polished.
6. **Graceful degradation, not bloat.** No JavaScript-for-decoration. If it doesn't aid comprehension, cut it.

---

## 2. Brand & Visual Identity

### 2.1 Working name
**LLMcalc** (compact, memorable, dev-friendly).
Fallback: **RigSize** (domain availability hedge).

### 2.2 Logo
A minimal wordmark + symbol.

**Symbol (favicon, app icon):**
A stylized GPU die — 3×3 grid of rounded squares with the center one accented. Renders cleanly at 16×16.

```
┌─┬─┬─┐
├─┼━┼─┤     ← center square in accent color
└─┴─┴─┘
```

**Wordmark:** `LLMcalc` set in **JetBrains Mono SemiBold**, letter-spacing `-0.02em`.

### 2.3 Personality spectrum

| Axis | Position |
|---|---|
| Playful ←→ Serious | 85% Serious |
| Ornate ←→ Minimal | 95% Minimal |
| Warm ←→ Cold | 70% Cold (neutral) |
| Loud ←→ Quiet | 90% Quiet |
| Decorative ←→ Functional | 100% Functional |

### 2.4 Voice
- Direct, short sentences.
- Technical terms used correctly without over-explaining.
- Second person ("you need...") not first person ("we suggest...").
- Never cheerful. Never apologetic. Precise.

**Good:** "Your config needs 55.8 GB VRAM. Fits on 1× H100 80GB at 70% utilization."
**Bad:** "Wow! Looks like you'll need a pretty beefy GPU for that one! 😅"

---

## 3. Design Tokens

All tokens are CSS custom properties defined in `:root` with `dark:` overrides. Exposed to Tailwind via `theme.extend`.

### 3.1 Token naming convention

```
--{category}-{role}-{modifier?}
```

Examples: `--color-bg-primary`, `--color-fg-muted`, `--space-4`, `--radius-md`.

### 3.2 Spacing scale (4px base)

| Token | Value | Use |
|---|---|---|
| `--space-0` | 0 | reset |
| `--space-1` | 4px | icon padding, tight gaps |
| `--space-2` | 8px | compact gaps, inline elements |
| `--space-3` | 12px | small card padding |
| `--space-4` | 16px | default gap, card padding |
| `--space-5` | 20px | |
| `--space-6` | 24px | section gaps |
| `--space-8` | 32px | large section gaps |
| `--space-10` | 40px | |
| `--space-12` | 48px | page section gaps |
| `--space-16` | 64px | hero spacing (rare) |
| `--space-20` | 80px | |
| `--space-24` | 96px | |

### 3.3 Radius scale

| Token | Value | Use |
|---|---|---|
| `--radius-none` | 0 | tables, full-bleed |
| `--radius-sm` | 4px | badges, chips |
| `--radius-md` | 6px | buttons, inputs (default) |
| `--radius-lg` | 8px | cards |
| `--radius-xl` | 12px | modals, drawers |
| `--radius-full` | 9999px | pills, avatars |

### 3.4 Z-index scale

| Token | Value | Use |
|---|---|---|
| `--z-base` | 0 | |
| `--z-dropdown` | 10 | |
| `--z-sticky` | 20 | sticky header |
| `--z-overlay` | 30 | dropdown menu overlay |
| `--z-drawer` | 40 | compare drawer |
| `--z-modal` | 50 | dialog |
| `--z-popover` | 60 | tooltip on modal |
| `--z-toast` | 70 | |

### 3.5 Size tokens (widths, heights)

```css
--size-icon-xs: 12px;
--size-icon-sm: 16px;
--size-icon-md: 20px;
--size-icon-lg: 24px;

--size-input-h: 36px;     /* default input height */
--size-input-h-sm: 28px;
--size-input-h-lg: 44px;

--size-button-h: 36px;
--size-button-h-sm: 28px;
--size-button-h-lg: 44px;

--size-container-sm: 640px;
--size-container-md: 768px;
--size-container-lg: 1024px;
--size-container-xl: 1280px;
--size-container-2xl: 1536px;
--size-container-max: 1920px;
```

---

## 4. Layout System

### 4.1 Breakpoints

| Name | Min width | Design for |
|---|---|---|
| `sm` | 640px | Large phones, reading guides |
| `md` | 768px | Tablet portrait |
| `lg` | 1024px | Tablet landscape, small laptop |
| `xl` | 1280px | **Primary desktop target** |
| `2xl` | 1536px | Large desktop |
| `3xl` | 1920px | Widescreen |

Mobile-first CSS; base styles are mobile, `md:` and up scale out.

### 4.2 Container widths

- Marketing/static pages: `max-w-5xl` (1024px)
- Calculator home: `max-w-[1760px]` with internal 12-col grid
- Guides / docs: `max-w-3xl` (768px) for readability

### 4.3 Grid

12-column grid, 24px gutter (desktop), 16px (tablet), stacked (mobile).

**Home page (desktop xl+):**
```
[ Inputs: 3 cols ][ VRAM Breakdown: 4 cols ][ Recommendations: 5 cols ]
```

**Home page (md):**
```
[ Inputs: 12 cols ]
[ VRAM Breakdown: 6 cols ][ Recommendations: 6 cols ]
```

**Home page (mobile):**
```
[ Mode tabs — full width ]
[ Inputs — full width, collapsible ]
[ VRAM Breakdown — full width ]
[ Recommendations — full width, card list ]
```

### 4.4 Page chrome

```
┌─────────────────────────────────────────────────────┐
│ TOP BAR   48px fixed                                 │
│  logo · nav · search  ·  theme · github · share      │
├─────────────────────────────────────────────────────┤
│ MODE TABS   48px (sticky on scroll)                  │
│  [Inference] [Scale] [Fine-tune] [Train] [Reverse]   │
├─────────────────────────────────────────────────────┤
│                                                      │
│ MAIN                                                 │
│                                                      │
├─────────────────────────────────────────────────────┤
│ FOOTER  (thin, unobtrusive)                          │
│  version · data-updated · methodology · github       │
└─────────────────────────────────────────────────────┘
```

---

## 5. Typography

### 5.1 Font families

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', Consolas, monospace;
--font-display: 'Inter', sans-serif;   /* same as sans; heavier weights */
```

- **Inter Variable** loaded self-hosted (woff2, `font-display: swap`).
- **JetBrains Mono Variable** for numbers, code, formulas.
- System fallbacks avoid FOIT.

### 5.2 Type scale

All sizes use `rem` with 16px base. Line heights tuned per size.

| Token | Size | Line Height | Use |
|---|---|---|---|
| `text-3xs` | 10px / 0.625rem | 14px / 1.4 | micro-labels, superscript |
| `text-2xs` | 11px / 0.6875rem | 16px / 1.45 | table cells, badges |
| `text-xs` | 12px / 0.75rem | 16px / 1.33 | secondary labels, captions |
| `text-sm` | 13px / 0.8125rem | 20px / 1.54 | UI body default |
| `text-base` | 14px / 0.875rem | 22px / 1.57 | dense UI text |
| `text-md` | 15px / 0.9375rem | 24px / 1.6 | |
| `text-lg` | 16px / 1rem | 26px / 1.625 | article body |
| `text-xl` | 18px / 1.125rem | 28px / 1.56 | subheads |
| `text-2xl` | 20px / 1.25rem | 28px / 1.4 | card headers |
| `text-3xl` | 24px / 1.5rem | 32px / 1.33 | section headers |
| `text-4xl` | 30px / 1.875rem | 36px / 1.2 | page titles |
| `text-5xl` | 36px / 2.25rem | 40px / 1.11 | number emphasis (VRAM total) |
| `text-6xl` | 48px / 3rem | 52px / 1.08 | rare, hero only |

**Note:** UI defaults to `text-sm` (13px) — denser than marketing sites, correct for a tool.

### 5.3 Weights

| Weight | Name | Use |
|---|---|---|
| 400 | Regular | body |
| 500 | Medium | UI labels, table headers |
| 600 | SemiBold | headings, buttons |
| 700 | Bold | emphasis, hero numbers |

Never use Inter Thin or Light — poor legibility.

### 5.4 Number rendering (critical)

All numeric output **must** use:
```css
font-family: var(--font-mono);
font-variant-numeric: tabular-nums;
font-feature-settings: "tnum", "cv10";   /* Inter stylistic set, mono fallback */
```

Numbers never wrap; long numbers truncate in their cell and show full value in a `<Tooltip>`.

### 5.5 Example combinations

**Big VRAM number (hero output):**
```
font: JetBrains Mono 700
size: 48px
letter-spacing: -0.02em
color: var(--color-fg-primary)

"55.8" [ GB ]        ← unit in text-xl, muted color, 8px left margin
```

**Table number:**
```
font: JetBrains Mono 400
size: 13px
tabular-nums
```

**Formula inline (KaTeX):**
```
size: 13px
color: var(--color-fg-default)
background: var(--color-bg-subtle)   ← on "reveal formula" panels only
```

---

## 6. Color System

### 6.1 Philosophy
- Neutral grayscale dominates (80% of pixels).
- **One** chromatic accent (Violet). Used sparingly for primary actions and active states.
- Semantic colors (green/amber/red) for fit badges and state.
- Zero gradients in production UI (one exception: subtle surface gradient in dark-mode hero).

### 6.2 Neutral palette

Designed against WCAG AA. Each step 5–15 lightness apart for predictable contrast.

**Light mode**
| Token | Hex | Purpose |
|---|---|---|
| `--color-bg-base` | `#ffffff` | page background |
| `--color-bg-subtle` | `#fafafa` | striped rows, inactive tabs |
| `--color-bg-muted` | `#f4f4f5` | inputs, cards |
| `--color-bg-emphasis` | `#e4e4e7` | hover, keyboard focus rings |
| `--color-border-subtle` | `#e4e4e7` | default border |
| `--color-border-default` | `#d4d4d8` | stronger border |
| `--color-border-strong` | `#a1a1aa` | focus, active |
| `--color-fg-muted` | `#71717a` | secondary text |
| `--color-fg-default` | `#3f3f46` | body text |
| `--color-fg-primary` | `#18181b` | headings, numbers |
| `--color-fg-inverse` | `#ffffff` | text on accent bg |

**Dark mode**
| Token | Hex | Purpose |
|---|---|---|
| `--color-bg-base` | `#09090b` | page background |
| `--color-bg-subtle` | `#0f0f12` | |
| `--color-bg-muted` | `#18181b` | inputs, cards |
| `--color-bg-emphasis` | `#27272a` | hover |
| `--color-border-subtle` | `#27272a` | |
| `--color-border-default` | `#3f3f46` | |
| `--color-border-strong` | `#52525b` | |
| `--color-fg-muted` | `#a1a1aa` | |
| `--color-fg-default` | `#d4d4d8` | |
| `--color-fg-primary` | `#fafafa` | |
| `--color-fg-inverse` | `#09090b` | |

### 6.3 Accent — Violet

Picked because it reads as technical and doesn't collide with semantic red/green. Sufficient contrast in both themes.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-accent-subtle` | `#f5f3ff` | `#1e1b2e` | badge bg |
| `--color-accent-muted` | `#ddd6fe` | `#3b2f66` | selected row bg |
| `--color-accent-default` | `#7c3aed` | `#8b5cf6` | primary button, links, active tab |
| `--color-accent-emphasis` | `#6d28d9` | `#a78bfa` | hover |
| `--color-accent-strong` | `#5b21b6` | `#c4b5fd` | active press |

### 6.4 Semantic — fit status + general state

**Fit status** (used by GPU cards, cloud rows):

| Status | Icon | Light | Dark | Meaning |
|---|---|---|---|---|
| 🟢 fits | check-circle | `#16a34a` | `#22c55e` | ≤80% VRAM utilization |
| 🟡 tight | alert-triangle | `#ca8a04` | `#eab308` | 80–100% utilization |
| 🔴 overflow | x-circle | `#dc2626` | `#ef4444` | >100% utilization |
| 🔵 info | info | `#2563eb` | `#3b82f6` | e.g., "needs TP=2" |
| ⚪ n/a | minus-circle | `--color-fg-muted` | `--color-fg-muted` | api-only, unknown |

Each status also gets a matching subtle bg for rows: `--color-{status}-subtle`.

### 6.5 Data viz palette

Used only in charts (stacked bar, topology). Distinct from UI palette, optimized for chart distinctness and color-blind safety.

| Role | Light | Dark |
|---|---|---|
| Weights | `#7c3aed` | `#8b5cf6` |
| KV cache | `#0891b2` | `#06b6d4` |
| Activations | `#ca8a04` | `#eab308` |
| Gradients | `#db2777` | `#ec4899` |
| Optimizer | `#ea580c` | `#f97316` |
| Overhead | `#64748b` | `#94a3b8` |
| Free / headroom | `#e4e4e7` | `#27272a` |

Color-blind check: verified via Deuteranopia, Protanopia, Tritanopia simulators — all series remain distinguishable (hue + luminance separation).

### 6.6 Contrast commitments

- Body text (fg-default on bg-base): **≥ 7.0:1** (AAA)
- UI labels (fg-muted on bg-base): **≥ 4.5:1** (AA)
- Disabled text: **≥ 3.0:1** (minimum for non-essential)
- Numbers against their row bg: **≥ 7.0:1** (numbers are the product)
- Focus ring: **≥ 3.0:1** against adjacent colors

---

## 7. Iconography

### 7.1 Icon system
**Lucide React** — single source, consistent stroke, tree-shakeable.

Never mix icon libraries. No emoji in UI chrome (emoji allowed only in fit badges where Unicode circles serve an accessibility fallback role).

### 7.2 Sizes

| Context | Size |
|---|---|
| Inline with `text-xs`/`text-sm` | 14px |
| Button / input icon | 16px |
| Card header | 20px |
| Empty state illustration | 32px |
| Section marker | 16–20px |

### 7.3 Stroke

All Lucide icons at `strokeWidth={1.75}` (slightly thinner than Lucide default of 2) — reads better at small sizes alongside Inter.

### 7.4 Icon map (canonical uses)

| Concept | Icon |
|---|---|
| Model | `Cpu` |
| GPU | `Microchip` / `CircuitBoard` |
| Cloud | `Cloud` |
| Memory | `MemoryStick` |
| Performance | `Gauge` |
| Cost | `DollarSign` |
| Share | `Share2` |
| Copy | `Copy` / `Check` (state swap) |
| Compare | `ArrowLeftRight` |
| Settings | `Sliders` |
| Info | `Info` |
| Formula | `Sigma` / `FunctionSquare` |
| External | `ArrowUpRight` |
| Dark mode | `Moon` / `Sun` |
| Reverse mode | `Repeat` |
| Training | `Dumbbell` / `Flame` |
| Fine-tune | `Wrench` |
| Cluster | `Network` |

---

## 8. Elevation, Radius, Borders

### 8.1 Elevation (shadows)

The app is flat by default; elevation is used only for overlays that must visually separate from content beneath.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--shadow-none` | none | none | default cards (rely on border) |
| `--shadow-sm` | `0 1px 2px rgb(0 0 0 / 0.04)` | `0 1px 2px rgb(0 0 0 / 0.5)` | hover lift |
| `--shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)` | `0 4px 12px rgb(0 0 0 / 0.6)` | dropdown |
| `--shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)` | `0 12px 24px rgb(0 0 0 / 0.7)` | modal |
| `--shadow-focus` | `0 0 0 2px var(--color-bg-base), 0 0 0 4px var(--color-accent-default)` | same structure | focus ring |

### 8.2 Border philosophy
Borders carry most of the visual separation. 1px, always `--color-border-subtle` by default. Hover → `--color-border-default`. Focus within → ring (shadow-focus), not border color change.

### 8.3 Radius usage table

| Component | Radius |
|---|---|
| Input, button, badge | `md` (6px) |
| Card, popover | `lg` (8px) |
| Modal, drawer, image | `xl` (12px) |
| Tag, avatar | `full` |
| Table, data grid | `none` (strict grid) |

---

## 9. Motion & Animation

### 9.1 Principles
- **Motion clarifies, never entertains.**
- **Fast is kind.** Max duration 200ms for any UI state change.
- **Respect `prefers-reduced-motion`** — all non-essential transitions disabled.

### 9.2 Easing & duration tokens

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);   /* sparingly; drawer open only */

--duration-instant: 0ms;
--duration-fast: 120ms;
--duration-base: 160ms;
--duration-slow: 240ms;     /* drawers, modals */
```

### 9.3 Interaction → motion map

| Interaction | Duration | Easing |
|---|---|---|
| Button hover | 120ms | out |
| Input focus ring | 120ms | out |
| Tab switch (content fade) | 160ms | out |
| Tooltip show | 120ms delay + 80ms fade | out |
| Dropdown open | 160ms | out |
| Modal open | 200ms bg fade, 240ms content slide | out |
| Drawer open | 240ms | spring |
| VRAM bar segment update | 400ms value tween | in-out |
| Tokens/sec counter update | 500ms number tween | out |
| Page transition | instant (no animation) | — |

### 9.4 What never animates
- Layout shifts from data loading (use skeletons, not fade-ins)
- Font size / weight changes
- Scroll (no scroll-triggered animations)
- Numbers used for life-critical precision (we show the new value immediately; the *bar* tweens, the *label* snaps)

---

## 10. Component Library

All components built on **shadcn/ui** base, customized per design tokens. Source-owned (copied into repo), not a dependency. Each gets a Storybook story with all variants.

### 10.1 Core primitives

#### Button

**Variants:** `primary`, `secondary`, `ghost`, `outline`, `destructive`, `link`
**Sizes:** `sm` (28px), `md` (36px default), `lg` (44px), `icon` (square)

```
primary:   bg=accent-default, fg=white, hover=accent-emphasis, active=accent-strong
secondary: bg=bg-muted, fg=fg-primary, border=border-subtle, hover bg=bg-emphasis
ghost:     bg=transparent, hover bg=bg-muted
outline:   bg=transparent, border=border-default, hover border=border-strong
destructive: bg=red-600, fg=white
link:      bg=transparent, fg=accent-default, underline on hover
```

States: `:hover`, `:focus-visible` (focus ring), `:active` (darken 5%), `:disabled` (opacity 0.5, cursor not-allowed), `loading` (spinner + text, disabled).

Icon-only buttons **must** carry `aria-label`.

#### Input (text, number)

- Height: 36px default.
- Padding: 8px 12px.
- Border: 1px `--color-border-default`.
- Radius: `md`.
- Focus: 2px ring (`--color-accent-default`), border color unchanged.
- Placeholder color: `--color-fg-muted`.
- Invalid state: border `red-500`, aria-describedby → error message.
- Numeric inputs get `inputmode="decimal"`, unit suffix rendered as adornment.

#### Select / Combobox

- Built on `cmdk` (shadcn `Command`) for searchable combos.
- Opens on click **and** keyboard (Enter, ArrowDown).
- Fuzzy search via Fuse.js with match highlighting (bold matched chars).
- Virtualized list if >50 items.
- Item structure: icon + primary label + secondary muted label + right-side meta chip.

Example Model picker item:
```
[🦙] Llama-3.1-8B-Instruct     8.03 B  · 128k  · GQA
     meta-llama · 2024-07-23                   [badge: MoE/Dense]
```

#### Slider

- Track height: 4px.
- Thumb: 16px, border `border-default`, bg `bg-base`, shadow `shadow-sm`.
- Active track: `accent-default`.
- Log-scale sliders (context length 1k → 1M) use `log2()` transform with snap markers at powers-of-two.
- Always accompanied by a numeric input box synced to the slider.
- Shows current value in a small pill above the thumb on drag.

#### Tabs (mode switch)

```
[Inference] [Scale] [Fine-tune] [Train] [Reverse]
```

- Horizontal, underline style (not pill style).
- Active tab: fg `fg-primary`, underline 2px `accent-default`.
- Inactive: fg `fg-muted`, hover fg `fg-default`.
- Keyboard: Arrow Left/Right to switch, Home/End for first/last.
- Tabs are links with proper URL routing (`/?mode=inference` etc).

#### Toggle / Switch

shadcn default; 36×20px, accent when on, neutral when off.

#### Segmented control

Used for precision picker. Horizontal buttons, one active with accent bg + white fg; others transparent. Keyboard navigable as a radio group.

### 10.2 Composite components

#### `<ModePill>`
Small inline badge showing current mode. Used in compare drawer and shared URLs.

#### `<ModelPicker>`
Combobox + model detail on hover (popover with architecture summary).

- Badges inside item: `MoE`, `VLM`, `Base`, `Instruct`, `Reasoning`.
- Group headers by family: "Llama", "Mistral", "Qwen", etc.
- Recent selections pinned at top (localStorage).

#### `<PrecisionPicker>`
Segmented control with dropdown expansion for detailed GGUF options.

```
[ FP16 ][ BF16 ][ INT8 ][ INT4 ][ GGUF ▾ ]
                                    └─ Q2_K, Q3_K_M, Q4_0, Q4_K_M…
```

Each option shows bytes/param on hover tooltip.

#### `<ContextSlider>`
Log-scale slider with markers at 1k, 4k, 8k, 16k, 32k, 128k, 256k, 1M. Model-specific max indicator shown as a vertical line ("Llama-3.1 max: 128k").

#### `<VRAMBreakdown>` — *flagship component*
Horizontal stacked bar + legend + totals. See §11.1.

#### `<GPUCard>`
```
┌────────────────────────────────────────────┐
│ 🟢  H100 SXM 80GB                           │
│     NVIDIA · Datacenter · $30k street       │
├────────────────────────────────────────────┤
│ Utilization: ▓▓▓▓▓▓▓░░░  70%                │
│ Free after your config: 24.2 GB             │
│                                             │
│ BW 3350 GB/s  ·  FP16 989 TFLOPS            │
│ Est. 62 tok/s  ·  700W TDP                  │
├────────────────────────────────────────────┤
│ Cheapest in cloud: Lambda $2.49/h        →  │
└────────────────────────────────────────────┘
```

**States:** default (border-subtle), hover (border-default + shadow-sm), selected (accent border), disabled/overflow (red border, subtle red tint).

Stats use tabular nums. Status icon sits top-left in a 24px circle with tinted bg.

#### `<CloudRow>`
Table row, not card. Columns:
```
[provider logo] Provider · Instance · GPUs · Interconnect · $/h · Spot $/h · $/M tok · Region · [→]
```

Sortable by any numeric column. Sticky header. Hover shows region availability popover.

#### `<ClusterTopology>`
SVG or react-flow diagram. Boxes = GPUs, edges = interconnect. Labels show parallelism strategy (TP=8 intra-node, FSDP across). See §11.2.

#### `<FormulaReveal>`
Accordion that expands below any output number.

```
VRAM total: 55.8 GB   [ ⓘ How is this calculated? ]

[expanded]
  weights:     70.55 B × 0.606 B/param   = 42.8 GB
  kv cache:    2×80×32768×8×128×2 B      = 10.7 GB
  activations: ≈ 0.8 GB (inference)
  overhead:    1.5 GB (CUDA context)
  ───────────────────────────────────────
  total:                                 = 55.8 GB

  formula (inference VRAM):
  $V = W + KV + A + O$                      ← KaTeX
  source: §5 of spec · Korthikanti et al. 2022
```

Uses monospace inside the reveal. LaTeX rendered via KaTeX.

#### `<ShareButton>`
Copy current URL with toast confirmation.

```
[ 🔗 Share ]  →  click  →  copies URL  →  toast: "Link copied"
                             (button briefly swaps to check icon)
```

#### `<CompareDrawer>`
Right-side drawer (480px wide). Pinned scenarios displayed as stacked cards with diff highlights (differences from primary config in bold + accent color).

### 10.3 Feedback components

- **Toast** — bottom-right (desktop), top (mobile). Sonner library. Max 3 stacked. Auto-dismiss 4s.
- **Tooltip** — Radix. 120ms delay show, 0ms hide.
- **Popover** — Radix. For richer tooltips (e.g., model architecture).
- **Alert** — inline, for inputs that cause warnings ("Context 128k × batch 32 requires 160 GB KV cache").
- **Banner** — top of page, dismissible, for global notices ("Prices updated 4 hours ago · view changelog").

### 10.4 Layout components

- **PageHeader** — title + description + action buttons row.
- **Section** — wraps logical blocks with optional title, description, right-side actions.
- **DefinitionList** — 2-column (label | value) used in result panels.
- **StatCard** — big number + label + delta, used in metrics row.

---

## 11. Data Visualization

### 11.1 VRAM Breakdown bar

**Anatomy:**
```
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒▒░░░░░░░░░░░░░░░░░░
│────────────────│─────────│────│
  weights 42.8GB   kv 10.7   act  overhead
  (77%)             (19%)     1%    3%

total: 55.8 GB / 80 GB (H100) — 70%
```

**Specs:**
- Height: 24px (plus 8px legend margin).
- Corner radius: only on outermost ends (`rounded-md`).
- Each segment: distinct data-viz color (§6.5), 1px white separator between adjacent segments (2px in dark mode).
- Hover on segment: tooltip with exact bytes, formula link.
- If total > selected GPU VRAM: show an **overflow strip** extending past the bar in red-striped fill, with a red vertical line marking the GPU limit.
- Below the bar: percentage labels using tabular nums; segments below 4% width hide their inline label (shown only in legend).

**Animation:** Bar segments tween from old widths to new over 400ms when any input changes. No entrance animation on initial render.

**Legend:** Right side on desktop, below bar on mobile. Uses colored dot + label + value.

### 11.2 Cluster topology diagram

react-flow-based SVG. Nodes are GPUs (256 max supported visually; beyond that, group into rack nodes).

**Node styles:**
- GPU node: 80×56 px rounded rect, shows vendor logo + model + VRAM
- Rack node (aggregation): 120×72 px, shows "8× H100" + "Rack 1"

**Edge styles:**
- NVLink: thick violet line, label "NVLink 900GB/s"
- PCIe: medium gray line
- InfiniBand: dashed teal line, label "IB NDR 400Gb/s"

**Auto-layout:**
- ≤8 GPUs: horizontal row (intra-node)
- 16–64 GPUs: 2D grid (rows = nodes)
- >64: aggregated view with drill-down on click

### 11.3 Tokens/sec gauge

A minimalist horizontal bar gauge rather than a dial. Shows:
- Current estimate (number + unit)
- Bar with theoretical max (100% of memory bandwidth) + efficiency factor markers (0.6, 0.85 ticks)
- Small sparkline or delta if user toggles batching

### 11.4 Cost comparison bars

Small horizontal bars (one per provider) for quick visual comparison in the cloud table's "summary row." Sorted by `$/M tokens` ascending.

### 11.5 Utilization circular indicator (GPU card)

A thin ring around the GPU icon:
- 0–80%: green (in `--color-success-default`)
- 80–100%: amber
- >100%: red, with broken-ring style showing overflow

Ring thickness 2px, size 24px.

---

## 12. Page Designs

### 12.1 `/` — Calculator Home (default route)

**Goal:** user lands → completes first calculation in ≤5 seconds without scrolling (desktop).

**Desktop xl layout (1280px+):**

```
┌──────────────────────────────────────────────────────────────────────┐
│ LLMcalc   Calculator · Compare · Reverse · Models · Hardware · Guides │
│                                     [ ⓘ data Apr 16 ] [🌙] [⚙] [GH] │
├──────────────────────────────────────────────────────────────────────┤
│  [Inference] [Scale] [Fine-tune] [Train] [Reverse] │ Share | Compare │
├────────────────┬─────────────────────────────┬───────────────────────┤
│ CONFIGURE      │ MEMORY                       │ RECOMMENDATIONS        │
│                │                              │                        │
│ Model          │  55.8 GB  required           │ HARDWARE (local)       │
│ [ search ▾ ]   │  ─────────────               │ ┌────────────────────┐│
│ Llama-3.1-70B  │  ▓▓▓▓▓▓▓▓▓▒▒▒░░░             │ │🟢 H100 SXM  80GB   ││
│                │   weights kv act ohd          │ │   70% util  $30k   ││
│ Precision      │                              │ │   Lambda $2.49/h   ││
│ [GGUF Q4_K_M ▾]│  weights    42.8 GB   77%    │ ├────────────────────┤│
│                │  kv cache   10.7 GB   19%    │ │🟢 A100 80GB         ││
│ Context 32k    │  activations 0.8 GB    1%    │ │🟢 RTX 6000 Pro     ││
│ [────●──────]  │  overhead    1.5 GB    3%    │ │🟡 2× RTX 4090      ││
│                │                              │ └────────────────────┘│
│ Batch 1        │  [ⓘ How calculated? ▾]       │                        │
│ [──●─────]     │                              │ TOKENS/SEC             │
│                │                              │  62 tok/s              │
│ ▸ Advanced     │                              │  ▓▓▓▓▓▓▓▒▒▒  67% BW    │
│                │                              │                        │
│                │                              │ $ / M TOKENS           │
│                │                              │  $11.15 (solo)         │
│                │                              │  $0.80 (batch 32)      │
├────────────────┴─────────────────────────────┴───────────────────────┤
│ CLOUD INSTANCES                                        Sort: $/h ▾   │
│  ─────────────────────────────────────────────────────────────────── │
│  Provider    Instance          GPUs      $/h     Spot   $/M tok   →  │
│  Lambda      H100 PCIe 80GB    1× H100   $2.49   —      $0.85        │
│  RunPod      H100 80GB         1× H100   $2.49   —      $0.85        │
│  AWS         p5.48xlarge       8× H100   $98.32  $28    $1.65        │
│  Azure       ND H100 v5        8× H100   $98.32  $30    $1.65        │
│  Together    Llama-3.1-70B     serverless  —    —       $0.88        │
├──────────────────────────────────────────────────────────────────────┤
│ CLUSTERING                              OS / SOFTWARE STACK          │
│  1× H100 · no parallelism needed         Ubuntu 24.04 · CUDA 12.4    │
│  Framework: vLLM (recommended)           driver 550 · PyTorch 2.4    │
├──────────────────────────────────────────────────────────────────────┤
│ Footer: methodology · github · data updated 4h ago · v1.2.3          │
└──────────────────────────────────────────────────────────────────────┘
```

**Behavior notes:**
- Every input change → recalculation in <50ms → all panels tween.
- "Share" button copies URL with full state.
- "Compare" opens right drawer pinning current config as slot 1.
- Scroll-sticky: top bar + mode tabs.
- Below the cloud table is always visible on scroll; not hidden behind a fold.

### 12.2 `/` — Mobile (under 768px)

```
┌──────────────────────────┐
│ ☰  LLMcalc          🌙 │
├──────────────────────────┤
│ [Inf][Scale][FT][Tr][Rv] │  ← horizontal scrolling tabs
├──────────────────────────┤
│ ▸ CONFIGURE (3 inputs)   │  ← collapsible header shows summary
│   Llama-3.1-70B · Q4_K_M │
│   32k · batch 1          │
│                          │
│ MEMORY                   │
│ ▓▓▓▓▓▓▓▓▒▒░               │
│ 55.8 GB total             │
│                          │
│ weights       42.8 GB    │
│ kv cache      10.7 GB    │
│ …                        │
├──────────────────────────┤
│ TOP PICKS                │
│  🟢 H100 80GB  $2.49/h   │
│  🟢 A100 80GB  $1.64/h   │
│  🟡 2× 4090             │
│  [ Show all 30 → ]       │
├──────────────────────────┤
│ CLOUD (horizontal scroll)│
│ Lambda │ RunPod │ AWS    │
├──────────────────────────┤
│ [ Share ] [ Compare ]    │
└──────────────────────────┘
```

**Mobile priorities:**
- Configure block collapses by default once a result exists (summary shown). Tap to re-edit.
- GPU list shows top 3 with "show all" expansion.
- Cloud table transforms to card carousel.
- Formula reveals become full-screen sheets.
- Share button is fixed to bottom action bar.

### 12.3 `/compare` — Comparison Mode

Up to **3 configurations** side-by-side.

```
┌────────────────────────────────────────────────────────────┐
│ [+ Add config]     Config A   │   Config B   │   Config C │
│                   ───────────┼─────────────┼──────────── │
│ Model             Llama-70B   │  Qwen-72B    │  Mixtral-8x22│
│ Precision         Q4_K_M      │  Q4_K_M      │  BF16        │
│ Context           32k         │  32k         │  32k         │
├────────────────────────────────────────────────────────────┤
│ VRAM required     55.8 GB     │  58.2 GB  +2.4  141 GB +85  │
│ Tokens/sec        62/s        │  58/s      -4  38/s  -24    │
│ Fit: H100 80GB    🟢 70%      │  🟢 73%       🔴 176%        │
│ Fit: A100 80GB    🟢 70%      │  🟢 73%       🔴 176%        │
│ Best cloud $/h    $2.49       │  $2.49     =   $20/h  +17.51│
│ $/M tokens        $11.15      │  $11.93       $15.20        │
└────────────────────────────────────────────────────────────┘
```

**Diff highlighting:**
- Numeric deltas shown inline with +/− signs and color (green improvement, red regression).
- Row highlight on hover.
- Pinned first row is "anchor"; others compare against it.
- Each column has a header with mode chip + copy-config button + remove button.

### 12.4 `/reverse` — Reverse Mode

"What can I run on my hardware?"

**Inputs:**
- GPU picker (or custom VRAM amount)
- Context length target
- Mode (inference / finetune)

**Output:**
- A sortable **grid** of models with compatibility status.
- Filters: family, size range, license, modality (text/vision/embedding).
- Each model card: fit badge, estimated tokens/sec, quantization options required.

```
┌──────────────────────────────────────────────────────────────┐
│ YOUR HARDWARE: 1× RTX 4090 (24 GB)     Context: 32k          │
├──────────────────────────────────────────────────────────────┤
│ Filters: [text] [vision] [MoE]   License: [all ▾]            │
│                                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │🟢 Llama-3 │ │🟢 Qwen-2.5│ │🟡 Mixtral│ │🔴 Llama-3│         │
│ │  8B       │ │  14B      │ │  8x7B Q4 │ │  70B     │         │
│ │ ~140 tok/s│ │ ~80 tok/s │ │ tight    │ │ too big  │         │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│  …                                                           │
└──────────────────────────────────────────────────────────────┘
```

### 12.5 `/models` — Model Catalog

Browsable, filterable table of all models in DB. Columns: name, family, params, context, license, modality, release date. Click → detail page with full architecture, benchmarks links, quantization recommendations.

### 12.6 `/hardware` — GPU Catalog

Same pattern for GPUs + cloud instances. Filter by vendor, memory, price range. Click → detail with spec sheet, benchmark notes, representative cloud availability.

### 12.7 `/guides` — Documentation

MDX-based articles.

**Layout:**
- Left: TOC sidebar (sticky, 240px)
- Center: article (max 680px reading width)
- Right: section anchors (sticky, 180px)

**Article topics (MVP):**
- "How VRAM is calculated" — the §5 formulas with interactive examples
- "Choosing a quantization" — quality vs size tradeoff
- "LoRA vs QLoRA vs full fine-tuning"
- "Single-node vs multi-node training"
- "Reading cloud pricing: spot, reserved, savings"
- Glossary

### 12.8 `/about` — Methodology & Trust

- Data sources with last-updated timestamps.
- Formula accuracy notes and caveats.
- How to report corrections (GitHub issue links).
- Who built it + license.

---

## 13. Interaction Patterns

### 13.1 Keyboard shortcuts

Global (shown in `?` help modal):

| Key | Action |
|---|---|
| `?` | Open shortcuts help |
| `⌘/Ctrl + K` | Open model search (combobox focus) |
| `⌘/Ctrl + \` | Toggle theme |
| `⌘/Ctrl + Enter` | Copy share URL |
| `c` | Add current config to compare |
| `i`, `s`, `f`, `t`, `r` | Switch to Inference / Scale / Fine-tune / Train / Reverse mode |
| `Esc` | Close open dialog / drawer |
| `g then m` | Navigate to Models catalog |
| `g then h` | Navigate to Hardware catalog |

### 13.2 URL state

Full app state serialized to URL query params. Every input change debounced 300ms → URL update (history.replaceState). Share button copies the current URL verbatim.

Schema example:
```
/?mode=inference
 &model=meta-llama/Llama-3.1-70B-Instruct
 &precision=q4_k_m
 &ctx=32768
 &batch=1
 &gpu=h100-sxm-80
 &compare=qwen2.5-72b:q4_k_m:32768,mixtral-8x22b:bf16:32768
```

### 13.3 Sharing

Three modes:
1. **Share URL** (default) — copy link, works instantly.
2. **Export PDF** (v1) — renders the current screen to a printable PDF (use `@react-pdf/renderer` or browser print with print stylesheet).
3. **Export JSON** — scenario JSON for API consumers.

### 13.4 Tooltips & popovers

- Tooltip = short, plain text, no interactivity.
- Popover = rich content, may contain buttons / links. Click-triggered.
- Tooltip shows after 500ms hover; popover on click.
- Focus keyboard users trigger tooltips on focus.

### 13.5 Error feedback

- Input-level: border red + helper text below, linked via `aria-describedby`.
- Form-level: top banner with icon + summary + "jump to first error" link.
- Global errors (data load fail): inline error state in affected panel, retry button. Never a full-page error unless catastrophic.

### 13.6 Unit conversion toggles

User setting (persisted): currency (USD / INR / EUR), VRAM units (always GB, no option — prevents confusion).

### 13.7 Copy-to-clipboard

All code snippets have a copy button top-right. On click → icon swap → "Copied" toast. Resets after 2s.

---

## 14. Responsive Behavior

### 14.1 Breakpoint strategy

| Breakpoint | Layout change |
|---|---|
| `<640px` | Stacked, collapsed inputs, carousel cards |
| `640–767` | Stacked, expanded inputs |
| `768–1023` | 2-column: inputs + (breakdown+recs stacked) |
| `1024–1279` | 3-column but narrower, reduced padding |
| `1280+` | Full 3-column with comfortable spacing |

### 14.2 Touch targets
- Minimum hit area: **44×44px** on touch devices (per WCAG 2.5.5 AAA).
- Visual size may remain smaller; hit area extended via padding.
- Hover-only features (tooltips) get a tap-to-reveal alternative on touch.

### 14.3 Mobile-specific adaptations
- **Bottom sheet** for model picker (full screen on phone, fuzzy search up top).
- **Sticky bottom action bar** for primary actions (Share / Compare).
- **Swipe gestures** for comparing configs (swipe between A/B/C).
- **No hover states** — use active/pressed instead.
- Larger type (+1 step on base body).
- Collapse everything below-the-fold into a "scroll for details" cue.

### 14.4 Print

A print stylesheet renders:
- Hide top bar, tabs, buttons.
- Expand all collapsibles.
- Serif override optional (readability on paper).
- Page-break-inside: avoid on cards.

---

## 15. Dark Mode

### 15.1 Detection & toggle
- Default: `prefers-color-scheme: dark` (dark is expected).
- Manual toggle in top bar (`Moon` / `Sun` icon).
- Persisted in localStorage, syncs across tabs via `storage` event.
- `<html data-theme="dark">` attribute to avoid FOUC; inline script in `<head>` reads preference before paint.

### 15.2 Dual rendering of data viz
Each chart palette has light and dark variants (§6.5). Charts re-render on theme change with tween over 160ms.

### 15.3 Elevation handling
In light mode, elevation uses shadows. In dark mode, elevation uses a *lighter* background instead of stronger shadow (since shadows on dark bg read as muddy).

```
Surface 0 (page):      #09090b   (dark) / #ffffff (light)
Surface 1 (card):      #0f0f12   (dark) / #fafafa (light)
Surface 2 (popover):   #18181b   (dark) / #ffffff + shadow-md
Surface 3 (modal):     #27272a   (dark) / #ffffff + shadow-lg
```

### 15.4 Images & logos
- GPU vendor logos: provide both color-on-light and color-on-dark variants.
- External logos fetched through a CDN with `prefers-color-scheme` aware srcset.

---

## 16. Loading, Empty & Error States

### 16.1 Loading

Three archetypes:

**Skeleton** — for known layout, unknown data.
- Grey blocks matching the final element dimensions.
- Subtle shimmer animation (only if `prefers-reduced-motion` is off).
- Appears at 150ms delay (avoid flashing for fast loads).

**Spinner** — for in-place actions (button loading).
- 16px Lucide `Loader2` with spin animation.
- Only on buttons, never as page-level primary.

**Progress** — for long operations (PDF export, heavy compute).
- Horizontal bar top of viewport.
- Percentage only if accurate.

### 16.2 Empty states

Every list/table has a purposeful empty state, not "No data."

Examples:
- Compare drawer empty: "Pin configurations here to compare side-by-side. Tap '+ Compare' on any calculation."
- Reverse mode no matches: "No models fit your hardware at this context length. Try lowering context or selecting a more aggressive quantization."
- Saved scenarios empty: "You haven't saved any scenarios yet. Save from the Share menu."

Each empty state has:
- Small icon (32px)
- Title (`text-md` semibold)
- Description (`text-sm` muted)
- Primary action button if applicable

### 16.3 Error states

- **Inline** (input): red border + helper text.
- **Panel-level** (data fetch fail): replace panel content with icon + "Couldn't load cloud prices · [Retry]".
- **Global** (catastrophic): full-screen message with home link. Never blank white screen.

All errors logged to Sentry with user-safe message surfaced.

---

## 17. Accessibility

### 17.1 WCAG target
**WCAG 2.2 AA** — full compliance day 1. **AAA** for body text contrast.

### 17.2 Semantic HTML
- Use `<button>`, `<a>`, `<input>`, `<label>` — never `<div>` with onClick.
- Landmarks: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`.
- Headings form a proper outline (no skipped levels).

### 17.3 ARIA patterns

Follow ARIA Authoring Practices 1.2:
- Combobox (model picker): `role="combobox"` + `aria-expanded`, `aria-controls`, `aria-activedescendant`.
- Tabs: `role="tablist" > role="tab"` with `aria-selected`.
- Tooltip: `role="tooltip"`, associated via `aria-describedby`.
- Modal: `role="dialog"` + `aria-modal="true"`, focus trap, focus returns to trigger on close.
- Slider: `role="slider"` with `aria-valuemin/max/now/text`.

### 17.4 Focus management
- `:focus-visible` only (no focus rings on mouse clicks).
- Ring: 2px `accent-default`, 2px offset from element.
- Tab order matches visual order.
- Skip link at top: "Skip to main content" visible on focus.

### 17.5 Screen reader considerations
- Icon-only buttons carry `aria-label`.
- Numbers with units: announce as "55.8 gigabytes" via `aria-label` override (otherwise SR says "55 point 8 GB").
- Dynamic updates to VRAM total announced via `aria-live="polite"` on a visually-hidden region.
- Formulas in KaTeX use their built-in MathML output for screen readers.

### 17.6 Motion
- Respect `prefers-reduced-motion: reduce` → disable all non-essential transitions; bar segments snap instead of tween; spinners become static "Loading…" text.

### 17.7 Color independence
- Fit badges use color + icon + text ("🟢 Fits", "🟡 Tight", "🔴 Doesn't fit"). Never just color.
- Chart segments have patterns available via a "Accessibility mode" toggle (diagonal lines, dots, etc).

### 17.8 Keyboard testing
- Every interactive element reachable via Tab.
- No keyboard traps.
- Esc always closes the deepest overlay.

---

## 18. Copy & Voice

### 18.1 Tone
- **Concise.** "Fits on H100." Not "Great news — this configuration will work on an H100!"
- **Precise.** "55.8 GB" not "about 56 GB" (unless explicitly an estimate).
- **Technical.** Assume the reader knows what VRAM, MFU, QPS mean; link to glossary for newcomers.
- **Honest.** "Estimate; real throughput varies ±15% depending on framework and request mix."

### 18.2 Units and number formatting
- Bytes: **GB** (not GiB; document this convention in methodology).
- Latency: **ms**.
- Throughput: **tok/s** (lowercase t in tokens, no period).
- Price: USD with `$` prefix and 2 decimals (`$2.49/h`), INR alternative shows as `₹207/h` with tooltip for conversion rate and date.
- Large numbers: **1,000** (en-US grouping) until i18n lands.
- Parameters: **8.03 B** (not 8,030,000,000 unless in formula reveal).

### 18.3 Microcopy library

| Context | Copy |
|---|---|
| Model picker placeholder | `Search models… (⌘K)` |
| No results in combobox | `No models match "xxx". Try "llama" or "qwen".` |
| Copy URL success | `Link copied` |
| Overflow warning | `Needs N GPUs or smaller quantization` |
| Price disclaimer | `On-demand pricing; prices change frequently. Updated 4h ago.` |
| Formula source | `Formula: §5 · source: Korthikanti 2022` |
| Reduced-motion notice | (silent) |
| Closed/API model selected | `This is an API-only model — no local hardware required.` |
| QLoRA too optimistic | `Estimate assumes gradient checkpointing enabled.` |

### 18.4 Error messages

Always state: what happened, why if known, what to do.

- "Couldn't load model data. Check your connection and reload."
- "Context length 1,048,576 exceeds this model's max of 128k."
- "Batch size 1024 × 128k context exceeds any known GPU. Reduce batch or context."

---

## 19. Implementation Notes

### 19.1 Tailwind config (core excerpt)

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    container: { center: true, padding: '1.5rem' },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '3xs': ['0.625rem', { lineHeight: '0.875rem' }],
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        xs:   ['0.75rem',   { lineHeight: '1rem' }],
        sm:   ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem',  { lineHeight: '1.375rem' }],
        md:   ['0.9375rem', { lineHeight: '1.5rem' }],
        // …
      },
      colors: {
        bg: {
          base:     'var(--color-bg-base)',
          subtle:   'var(--color-bg-subtle)',
          muted:    'var(--color-bg-muted)',
          emphasis: 'var(--color-bg-emphasis)',
        },
        fg: {
          muted:   'var(--color-fg-muted)',
          default: 'var(--color-fg-default)',
          primary: 'var(--color-fg-primary)',
          inverse: 'var(--color-fg-inverse)',
        },
        border: {
          subtle:  'var(--color-border-subtle)',
          DEFAULT: 'var(--color-border-default)',
          strong:  'var(--color-border-strong)',
        },
        accent: {
          subtle:   'var(--color-accent-subtle)',
          muted:    'var(--color-accent-muted)',
          DEFAULT:  'var(--color-accent-default)',
          emphasis: 'var(--color-accent-emphasis)',
          strong:   'var(--color-accent-strong)',
        },
        success: { /* … */ },
        warning: { /* … */ },
        danger:  { /* … */ },
        info:    { /* … */ },
        viz: {
          weights:     'var(--color-viz-weights)',
          kv:          'var(--color-viz-kv)',
          activations: 'var(--color-viz-activations)',
          gradients:   'var(--color-viz-gradients)',
          optimizer:   'var(--color-viz-optimizer)',
          overhead:    'var(--color-viz-overhead)',
          free:        'var(--color-viz-free)',
        },
      },
      borderRadius: {
        sm: '4px', md: '6px', lg: '8px', xl: '12px',
      },
      spacing: {
        /* 4px grid already in Tailwind; keep defaults */
      },
      transitionDuration: {
        fast: '120ms', base: '160ms', slow: '240ms',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
  ],
} satisfies Config;
```

### 19.2 CSS variables (root)

```css
/* src/styles/tokens.css */
:root {
  /* Backgrounds */
  --color-bg-base:      #ffffff;
  --color-bg-subtle:    #fafafa;
  --color-bg-muted:     #f4f4f5;
  --color-bg-emphasis:  #e4e4e7;
  /* Foregrounds */
  --color-fg-muted:     #71717a;
  --color-fg-default:   #3f3f46;
  --color-fg-primary:   #18181b;
  --color-fg-inverse:   #ffffff;
  /* Borders */
  --color-border-subtle:  #e4e4e7;
  --color-border-default: #d4d4d8;
  --color-border-strong:  #a1a1aa;
  /* Accent */
  --color-accent-subtle:   #f5f3ff;
  --color-accent-muted:    #ddd6fe;
  --color-accent-default:  #7c3aed;
  --color-accent-emphasis: #6d28d9;
  --color-accent-strong:   #5b21b6;
  /* Semantic */
  --color-success-default: #16a34a;
  --color-warning-default: #ca8a04;
  --color-danger-default:  #dc2626;
  --color-info-default:    #2563eb;
  /* Viz */
  --color-viz-weights:     #7c3aed;
  --color-viz-kv:          #0891b2;
  --color-viz-activations: #ca8a04;
  --color-viz-gradients:   #db2777;
  --color-viz-optimizer:   #ea580c;
  --color-viz-overhead:    #64748b;
  --color-viz-free:        #e4e4e7;
  /* Focus ring */
  --focus-ring: 0 0 0 2px var(--color-bg-base), 0 0 0 4px var(--color-accent-default);
}

[data-theme="dark"] {
  --color-bg-base:      #09090b;
  --color-bg-subtle:    #0f0f12;
  --color-bg-muted:     #18181b;
  --color-bg-emphasis:  #27272a;
  --color-fg-muted:     #a1a1aa;
  --color-fg-default:   #d4d4d8;
  --color-fg-primary:   #fafafa;
  --color-fg-inverse:   #09090b;
  --color-border-subtle:  #27272a;
  --color-border-default: #3f3f46;
  --color-border-strong:  #52525b;
  --color-accent-subtle:   #1e1b2e;
  --color-accent-muted:    #3b2f66;
  --color-accent-default:  #8b5cf6;
  --color-accent-emphasis: #a78bfa;
  --color-accent-strong:   #c4b5fd;
  --color-viz-weights:     #8b5cf6;
  --color-viz-kv:          #06b6d4;
  --color-viz-activations: #eab308;
  --color-viz-gradients:   #ec4899;
  --color-viz-optimizer:   #f97316;
  --color-viz-overhead:    #94a3b8;
  --color-viz-free:        #27272a;
}

html { font-family: var(--font-sans); }
body { background: var(--color-bg-base); color: var(--color-fg-default); }
code, .mono, .num { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
```

### 19.3 Component directory layout

```
src/
├── components/
│   ├── primitives/          # base shadcn-derived
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── slider.tsx
│   │   ├── tabs.tsx
│   │   ├── tooltip.tsx
│   │   └── …
│   ├── calculator/
│   │   ├── ModePicker.tsx
│   │   ├── ModelPicker.tsx
│   │   ├── PrecisionPicker.tsx
│   │   ├── ContextSlider.tsx
│   │   ├── BatchSlider.tsx
│   │   ├── AdvancedPanel.tsx
│   │   ├── VRAMBreakdown.tsx
│   │   ├── GPUCard.tsx
│   │   ├── GPUList.tsx
│   │   ├── CloudTable.tsx
│   │   ├── CloudRow.tsx
│   │   ├── ClusterTopology.tsx
│   │   ├── FormulaReveal.tsx
│   │   ├── MetricsRow.tsx
│   │   ├── CompareDrawer.tsx
│   │   └── ShareButton.tsx
│   ├── layout/
│   │   ├── TopBar.tsx
│   │   ├── Footer.tsx
│   │   └── PageShell.tsx
│   └── feedback/
│       ├── Toast.tsx
│       ├── EmptyState.tsx
│       └── ErrorState.tsx
├── styles/
│   ├── tokens.css
│   └── globals.css
└── lib/
    ├── formulas/            # pure calc (see SPECIFICATION.md §5)
    └── …
```

### 19.4 Storybook
Every component in `components/` has a `.stories.tsx` file with all variants and edge cases (empty, error, long text, RTL). Storybook deployed to `storybook.llmcalc.dev`.

### 19.5 Figma handoff

Figma file structure:
- **01 Foundations** (tokens, color, type, spacing, iconography)
- **02 Primitives** (Button, Input, etc.)
- **03 Patterns** (ModelPicker, GPUCard, etc.)
- **04 Pages** (home, compare, reverse — desktop + mobile)
- **05 Prototypes** (key flows)

Color styles and text styles mapped 1:1 to CSS token names.

---

## 20. Deliverables Checklist

### 20.1 Design deliverables
- [ ] Figma file (foundations + primitives + patterns + pages, light+dark)
- [ ] Mobile designs for every page
- [ ] Empty / loading / error state designs
- [ ] This document, signed off
- [ ] Accessibility audit checklist (WCAG 2.2 AA)

### 20.2 Frontend engineering deliverables
- [ ] Design tokens in CSS vars + Tailwind config
- [ ] All primitive components in Storybook with a11y tests
- [ ] All calculator components wired to formula kernel
- [ ] Home page implemented desktop + mobile
- [ ] Dark mode parity
- [ ] Keyboard shortcut layer
- [ ] URL state serialization (nuqs)
- [ ] Playwright e2e: key user flows
- [ ] Lighthouse scores: Performance ≥95, Accessibility ≥100, Best Practices ≥95, SEO ≥95
- [ ] Bundle size budget: ≤ 180 KB gzipped initial JS
- [ ] Core Web Vitals: LCP ≤ 1.8s, INP ≤ 200ms, CLS ≤ 0.05

### 20.3 Copy deliverables
- [ ] Microcopy library reviewed and consistent
- [ ] Glossary page authored
- [ ] Methodology page authored
- [ ] Error messages pass the "what/why/do" test

---

*End of frontend design document. Ready for Figma + implementation kickoff.*
