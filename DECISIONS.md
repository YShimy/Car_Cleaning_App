# Decisions

One line per decision: **what** — why.

## Phase 0 — Setup

- **Tailwind v4 with tokens in `src/index.css` (`@theme`)** — v4 is the latest stable and is CSS-first; there is no `tailwind.config.js`. The `@theme` block plays that role and also exposes every token as a CSS variable.
- **shadcn-style components written by hand on Radix primitives** — the shadcn CLI is interactive and generates far more than this demo needs; the hand-written versions follow the same pattern (Radix + Tailwind + `cva`) with less code to read.
- **Vite `base: './'` instead of `'/Car_Cleaning_App/'`** — with HashRouter a relative base works on GitHub Pages under any repo name, on a custom domain, and from `vite preview`, with nothing to change if the repo is renamed.
- **Single `tsconfig.json`** — one config for app, tests and tool configs keeps `npm run typecheck` simple.
- **`@playwright/test` pinned to 1.63.0** — matches the Chromium build available in the build environment; CI installs the matching browser itself.
- **Token colours darkened slightly from the plan's examples** — success/warning/secondary-text examples fall below 4.5:1 on white; the plan asks for WCAG AA.

## Phase 1 — Design system

- **Native `<select>` instead of a custom Radix select** — on phones the native picker is the most familiar and most accessible control for a 25–65 audience.
- **Sheets portal into the phone frame** — the frame has a CSS transform, so `position: fixed` overlays stay inside the "phone" on desktop instead of covering the whole window.
- **Toasts in a tiny separate Zustand store (not persisted)** — toasts are transient UI, not demo data; keeping them out of `useDemoStore` keeps the persisted state clean.
- **Types, `business.ts` and `rules.ts` written alongside Phase 1** — PlanCard and DayCapacityCard need prices and capacity status; their tests land in Phase 2.

## Phase 2 — Domain, data and rules

- **~290 customers instead of ≈375** — the plan's numbers do not fit together: 375 customers need ~470 washes a week, and 9 washers × 14 washes/day × 2 service days × 2 compounds is 504. That is 93% utilisation with every day nearly full. The generator therefore draws 25–50 customers per compound but stops when a compound's days are full. Raise `WASHES_PER_WASHER_PER_DAY` in `business.ts` and the customer count grows on the next reset.
- **Willow Bay (onboarding) has no subscribers** — it is shown as "Coming soon — join waitlist", so it cannot already have customers.
- **Capacity is fixed for two compounds** — Palm Grove always has 6 and 2 spots left, and Cedar Heights always has a full Sunday, so the "nearly full" and "Full — join waitlist" states are always visible in a demo.
- **`compoundId` added to `Subscription`, `customerId` to `Wash`** — denormalised so capacity and customer screens need no joins.
- **Interior cleans fall on the first wash of the month** (Premium: also the first wash from the 15th) — the plan says "1 interior per month" but not when; a fixed rule is easy to explain to a customer.
- **A cancelled subscription frees its slot; paused and pending-payment ones keep it** — otherwise a resident returning from a pause could find their day full.
- **Changing wash day moves capacity immediately but washes from next Sunday** — holds the new slot for the customer while respecting "takes effect next week".
- **Cancellation keeps `status: active` with a `cancelAt` date** — the customer keeps their washes until the end of the paid month; churn counts subscriptions whose end date has passed.
- **State transitions are pure reducers in `src/store/reducers.ts`** — the store only wires them up, so cross-role effects are unit-tested without React.
- **Weather delays affect a whole compound-day** — rain does not hit single cars; three rained-off compound-days are generated in the history.
- **Stored data is regenerated when the calendar day changes** — dates are relative to "today"; yesterday's "live" washes would look wrong. Interview recordings are stored separately and survive.
- **localStorage writes are debounced (250 ms)** — the state is ~1.6 MB of JSON; one write per burst of actions keeps taps instant on phones.

## Phase 3 — Car illustrations

- **Before/after slider is a native range input over the picture** — mouse, touch and keyboard support and slider semantics for screen readers come from the browser instead of custom pointer code.
- **Dirt and sparkles are seeded per wash** — the same wash always shows the same "photo", like a real one would.
