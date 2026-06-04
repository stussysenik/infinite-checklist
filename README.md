# Infinite checklist experience

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/senik/v0-infinite-checklist-experience)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/ss27Kl0PCgq)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/senik/v0-infinite-checklist-experience](https://vercel.com/senik/v0-infinite-checklist-experience)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/ss27Kl0PCgq](https://v0.app/chat/ss27Kl0PCgq)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Documentation & Proof
- Project narrative: [docs/PROJECT_NARRATIVE.md](docs/PROJECT_NARRATIVE.md)
- CI guard: [.github/workflows/documentation-proof.yml](.github/workflows/documentation-proof.yml)
- This project documentation emphasizes user journey, design methodology, progress, tech stack, key concepts, and implementation evidence.

---

## Design & Engineering Reasoning

This is an experience-design-engineering piece: a deliberately *lo-fi*, minimalist-essentialist
checklist with a neo-brutalist, "view-source / old-web" feel. The goal is to demonstrate
**taste on a tiny surface** — depth over breadth — not to ship features. Every decision below
was made by elimination; the recurring principle is *choose less*.

### North star — both, sequenced
- **Phase 1 (v1.1): perfect the craft.** Single screen, client-only, ruthlessly lean.
- **Phase 2 (`/infinite` branch): one multiplayer layer.** A shared canvas where
  "everyone connected can see it," in the spirit of early-web — built later, in isolation.
- **Hard gate between them.** No Phase-2 code lands until v1.1 passes its ship gate.
  The named failure mode is *two half-done things*; sequencing is the guard against it.

### Decisions (the why, not just the what)
| Area | Decision | Reasoning |
|---|---|---|
| **CSS substrate** | UnoCSS — `presetAttributify` + `presetTachyons` + custom fluid `rules`. Tailwind v4 removed. | The attributify + Tachyons vocabulary *is* the "pure HTML" aesthetic. The engine swap is committed for the DX/feel, not raw capability. |
| **Constraint engine** | Uno `shortcuts` + `blocklist` + `@unocss/eslint-plugin`. CVA and Cassowary **dropped**. | The real ask was *design-token discipline*, not runtime layout solving. Uno's own primitives enforce the scale at lint time — "it won't even let you" use an off-scale value. Cassowary solves a problem this project doesn't have. |
| **Migration** | Full replace, **spike-gated** (prove Uno renders in Next 16 + Turbopack before rewriting). | De-risk the unknown in 30 minutes instead of 200 LOC deep. |
| **State** | localStorage now, behind an **op-based, CRDT-shaped `useTodos()` store** (`add/toggle/move/remove`). | Refresh-safety is table stakes. The op-based interface is insurance: Phase 2 swaps the backing to a `Y.Doc` (Y.js + `y-indexeddb` + PartyKit) with **zero UI changes**. Also extracts state out of the monolith. |
| **Footprint** | Lean-React, **512kb-club**, hard budget **≤120KB first-load JS**. | React/Next has a ~90KB floor — the 10kb club is physically impossible on this stack. So "kb website" is an *aesthetic + achievable budget*, proven by the `next build` First-Load-JS column, not a literal sub-10KB target. |
| **Motion** | **No** spring library, **no** new animation. Existing micro-motion preserved or trimmed. | A physics lib (~30–50KB) to make a todo "pop" would betray the small-footprint ethos. Restraint *is* the craft here. |
| **Layout** | **Rhythm grid only** — single column, invisible 8pt baseline + fluid spacing. No card wall. | Keeps the essentialist single-column feel. The grid is *discipline*, not decoration. |
| **Type** | Fluid `clamp()` scale, restrained **~12 → 24pt** range, tight grotesque steps, low fluidity. | Grotesque over theatrical: flat, raw, stable hierarchy from a neutral grotesque-sans lineage — true to the lo-fi / pure-HTML intent rather than designed-to-impress. |

### "Responsive by default" — the actual mechanism
Not the CSS engine. Responsiveness comes from **fluid tokens** (`clamp()`-based type and
spacing) plus container/auto-flow layout — so the UI adapts continuously with **near-zero
media queries**. The engine (Uno/Tachyons/Tailwind) is interchangeable; the *token system*
is the whole game.

### v1.1 ship gate (each item proven, not asserted)
1. Uno spike green; `next build` passes on Next 16.
2. Tailwind fully removed (no dep, no PostCSS plugin).
3. Lint **fails red** on an off-scale value, **passes green** when fixed (constraint proof).
4. Zero hardcoded font-size/spacing outside the scale (grep proof).
5. Persistence: type → refresh → survives; state lives in `useTodos`, not the component.
6. Budget — see status note below.
7. Single column reflows fluidly with ~zero media queries (DevTools resize).

### Build status (v1.1 spike — verified)
- **Engine swap green:** `next build` compiles on Next 16 + Turbopack via
  `@unocss/postcss`; Tailwind fully removed. Generated CSS = **5.5KB gz**.
- **Verified in output:** fluid type tokens, color tokens, `font-spraypaint`,
  attributify selectors (`[text~="fluid-display"]`, `[font~="spraypaint"]`),
  brutalist shadows — all present in the built CSS.
- **Constraint engine:** `bun run lint:grid` is **green** (no off-grid type/space).
- **Budget — honest miss to reconcile:** First-Load JS measured **167.7KB gz**,
  over the self-set ≤120KB sub-budget. Root cause is structural — the React 19 +
  Next 16 App Router framework floor is ~165KB gz; 120KB is below it and isn't
  reachable without Preact-compat (explicitly out of scope). The *actual*
  512kb-club metric is total transfer ≤512KB, which this passes by a wide margin
  (~173KB JS+CSS + fonts). Recommended reconciliation: track the 512kb-club total
  (PASS) and drop the 120KB JS sub-budget as below-floor.
- **No Tachyons preset:** `@unocss/preset-tachyons` is unpublished for UnoCSS v66
  (spike confirmed 404). Tachyons' spirit is delivered via `presetWind3` +
  attributify + custom terse `shortcuts` (`ba`, `bw2`, brutalist recipes) instead.
