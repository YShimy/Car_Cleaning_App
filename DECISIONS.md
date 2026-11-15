# Decisions

One line per decision: **what** — why.

## Phase 0 — Setup

- **Tailwind v4 with tokens in `src/index.css` (`@theme`)** — v4 is the latest stable and is CSS-first; there is no `tailwind.config.js`. The `@theme` block plays that role and also exposes every token as a CSS variable.
- **shadcn-style components written by hand on Radix primitives** — the shadcn CLI is interactive and generates far more than this demo needs; the hand-written versions follow the same pattern (Radix + Tailwind + `cva`) with less code to read.
- **Vite `base: './'` instead of `'/Car_Cleaning_App/'`** — with HashRouter a relative base works on GitHub Pages under any repo name, on a custom domain, and from `vite preview`, with nothing to change if the repo is renamed.
- **Single `tsconfig.json`** — one config for app, tests and tool configs keeps `npm run typecheck` simple.
- **`@playwright/test` pinned to 1.63.0** — matches the Chromium build available in the build environment; CI installs the matching browser itself.
- **Token colours darkened slightly from the plan's examples** — success/warning/secondary-text examples fall below 4.5:1 on white; the plan asks for WCAG AA.
