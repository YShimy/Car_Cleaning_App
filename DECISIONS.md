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

## Phase 4 — Launcher, toolbar, routing

- **"Simulate next step" pulls the persona's next wash forward to today if they have none today** — otherwise the live flow could only be demonstrated on the customer's actual wash day. It also moves every washer working today one step, so the admin board moves too.
- **Customer and washer views are in the main bundle; admin, manager, styleguide and share pages are lazy chunks** — phones load only what they need; the charts library never reaches a resident's phone.
- **Demo toolbar sits above the tab bar on phones** — bottom-left would cover the Home tab.
- **Reset keeps presentation mode on** — resetting between two interviews should not reveal the demo controls.
- **WhatsApp-style previews come from watching the notification list** — any action in any role that notifies the logged-in customer shows the preview, with no coupling between the store and the toast UI.

## Phase 5 — Customer onboarding

- **Steps 2, 3 and 4 are split into two screens each (still "Step X of 7")** — the plan asks for at most 3 inputs per screen, and the car step alone has 7 fields.
- **A first-name field was added to the "Your home" screen** — the success screen greets the customer by name, and the plan had no screen that asks for it.
- **No plan or day is pre-selected** — a default would bias the plan and day choices recorded in interviews. The one exception: when only one option is possible (Premium, or one day full) it is selected automatically.
- **Make, model and year are native selects rather than a searchable list** — 21 models is short enough, and the native picker is the most familiar control on a phone.
- **The demo toolbar is hidden while an interview is being recorded** — the resident should see only the product; it returns when they finish or abandon.
- **Cash on first wash creates an active subscription with a "due" payment** — the slot is held; admin sees the amount as outstanding.
- **Choosing a different compound or plan clears the chosen day** — days and capacity belong to the compound, and Premium uses both days.

## Phase 6 — Customer core

- **"Washer on site" reads "Your car is next" in the timeline** — on site means the washer is in the compound, not yet at this car; saying "washing" early would be untrue.
- **Rating tags appear only after stars are chosen** — positive and negative tags differ, and showing both at once adds noise.
- **Skip, pause and change-day rules are enforced in reducers and explained in sheets** — the UI disables what it can and the reducer still rejects anything invalid, with a plain-language message.
- **Demo toolbar sits below sheets (z-index)** — it must never cover a sheet's primary button.

## Phase 7 — Customer extras

- **Add-a-car is a 3-step sheet (car, plan and day, review)** — an existing customer already has a compound and payment method, so the full 7-step flow would be repetition.
- **Add-ons are charged once, when added; a free tire-shine credit is used automatically** — "skip = one free add-on" stays simple and visible, with no separate redemption step.
- **Damage reports older than 24 hours are blocked with an explanation and a route to a person** — the rule is enforced, but the customer is not left at a dead end.
- **Chat is a fixed script, labelled as such** — the plan asks for no AI; the label avoids implying a live agent.
- **Cancel flow: reason, then one confirmation with the end date; "Pause instead" is offered once as a secondary button** — honest, two steps, no guilt copy; it can be undone until the end date.
- **Plan changes apply from tomorrow with a plain prorating note** — the demo does not compute prorated charges; it states the rule.
- **Notifications are marked read when the screen opens but stay highlighted for that visit** — the badge clears without the user losing track of what was new.
- **Demo toolbar is hidden while any sheet is open** — it must never cover a primary button.

## Phase 8 — Washer app

- **The wash flow hides the tab bar and uses 56 px buttons throughout** — one task at a time, usable one-handed outdoors.
- **"I found the car" marks the washer as on site; the before photo starts the wash** — the customer's timeline follows real events with no extra taps for the washer.
- **Checklist and damage marks are saved as the washer goes** — closing the flow mid-wash and reopening it resumes at the checklist.
- **Washer flags ("car not found", "car covered") skip the wash, open an issue and notify the customer; "customer asked to skip" only skips** — the office needs to follow up on the first two, not the third.
- **A demo-only washer switcher lives in Profile (hidden in presentation mode)** — lets the presenter jump to a washer who works today.
