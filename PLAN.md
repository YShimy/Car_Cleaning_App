# Lamaa — Compound Car Wash Demo App: Build Plan for Claude Code

> **For Youssef (read this first, then delete or keep this box):**
> 1. Create an empty folder or GitHub repo and put this file in it as `PLAN.md`.
> 2. Open Claude Code in that folder and say:
>    *"Read PLAN.md fully. Execute it phase by phase in order. After each phase, run the checks listed in that phase, commit, and continue. Only stop to ask me if you are truly blocked."*
> 3. Everything marked **(assumption)** is a placeholder (prices, capacity, brand name). Change it in `src/config/business.ts` once you have real numbers.
> 4. "Lamaa" (لمعة, "shine") is a placeholder brand. Check that the name is free before using it publicly.

---

## 0. Instructions to Claude Code

You are building a **clickable, frontend-only demo** of a car-wash subscription service for residential compounds in Egypt. It will be shown on a phone to compound residents in interviews, and on a laptop to compound managers and an investor.

Work rules:

- Follow the phases in section 14 **in order**. Do not skip ahead.
- After each phase: run `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`. Fix all errors before committing.
- Commit after each phase with a conventional commit message, e.g. `feat(customer): onboarding flow`.
- Never add a backend, database, real authentication, real payment integration, analytics service, or any network call. Everything runs in the browser from mock data.
- Prefer simple, readable code over clever abstractions. This is a demo, but the code should be clean enough to show in a portfolio.
- When this plan is silent on a detail, choose the option that makes the interface **simpler and more trustworthy for a non-technical user**, and note the decision in `DECISIONS.md`.
- Keep a running `DECISIONS.md` (one line per decision: what, why).

---

## 1. Product context (why this app exists)

**The business:** residents of gated compounds subscribe to recurring car washes. A washer visits each compound on **fixed service days** and washes subscribed cars in their parking spots, using a waterless method. Customers get before/after photos of every wash.

**The key difference from competitors:** competitors are *on-demand* (request a wash anywhere, a washer drives to you). This service is *compound-centric*: each compound has fixed service days with limited capacity, so washers work densely in one place. The app must make this feel like a **benefit** ("your compound's wash day — no booking every time"), not a limitation.

**Who will use the demo:**

| Audience | Device | What they must understand within 2 minutes |
| --- | --- | --- |
| Compound residents (interviews) | Phone | How to subscribe, what they get, what it costs, that they can trust it |
| Compound managers | Laptop or tablet | Washers are vetted and scheduled; the compound stays in control |
| Investor | Laptop | How operations run across 10 compounds and what is measured |

**Primary design goal:** a resident aged 25–65 who has never used a car-wash app subscribes in under 2 minutes without asking for help.

---

## 2. Hard constraints

1. **Frontend only.** Mock data generated in code, persisted to `localStorage`. A "Reset demo" action restores the initial state.
2. **English only**, left-to-right. Do not add i18n infrastructure.
3. **Mobile-first** for Customer and Washer views (designed at 390 × 844). Admin and Compound Manager views are desktop-first but must remain usable on a tablet.
4. **No real personal or payment data.** Login uses a fake OTP. The payment form is pre-filled with demo values and its fields are read-only, with a clear "Demo — no payment is processed" note. People in interviews must never type real card numbers.
5. **Fictional compound names only.** Do not use real compound or developer names; the demo must not imply partnerships that do not exist.
6. **Demo data must be labelled.** Every admin and compound-manager screen shows a small, persistent "Demo data — illustrative only" badge. Metrics are invented for the demo and must never look like real results.
7. **Deterministic data.** Mock data is generated from a fixed seed, so every reset produces the same compounds, customers and history. Dates are generated **relative to today** so the demo always feels current.
8. **No external images or fonts at runtime** except the font package installed via npm. Car photos are generated SVG illustrations (section 9.4).

---

## 3. Tech stack

Use the latest stable versions at install time.

| Concern | Choice | Why |
| --- | --- | --- |
| Build tool | Vite | Fast, simple static build |
| UI | React + TypeScript (`strict: true`) | Standard, portfolio-friendly |
| Styling | Tailwind CSS | Consistent design tokens quickly |
| Components | shadcn/ui (Radix-based) | Accessible primitives: dialogs, sheets, tabs, toasts |
| Icons | lucide-react | Clean, consistent line icons |
| Routing | React Router with **HashRouter** | Works on GitHub Pages without server config |
| State | Zustand with `persist` middleware (localStorage) | Simple global store, survives reloads |
| Dates | date-fns | Small and clear |
| Charts | Recharts | Simple dashboard charts |
| Mock data | Hand-written generator with a seeded PRNG (e.g. mulberry32) | Deterministic, no heavy dependency |
| Font | Inter via `@fontsource/inter` | Highly legible, neutral, trustworthy |
| Unit tests | Vitest + React Testing Library | Test business rules and key components |
| E2E smoke test | Playwright (one test file) | Proves the main customer flow works |
| Lint/format | ESLint + Prettier | Clean code |
| Deploy | GitHub Pages via GitHub Actions | Free shareable link for interviews |

Scripts required in `package.json`: `dev`, `build`, `preview`, `typecheck`, `lint`, `format`, `test`, `test:e2e`.

---

## 4. Product decisions

### 4.1 Plans (subscription only, no one-off washes)

All values live in `src/config/business.ts` **(assumption — change after interviews)**.

| Plan | Includes | Price / month |
| --- | --- | --- |
| **Essential** | 1 exterior wash per week | EGP 650 |
| **Plus** *(highlight as "Most popular")* | 1 exterior wash per week + 1 interior clean per month | EGP 950 |
| **Premium** | 2 exterior washes per week + 2 interior cleans per month | EGP 1,600 |

- Billed monthly. Cancel anytime; cancellation takes effect at the end of the paid month.
- **Second car and more:** 15% off each additional car's plan (family plan).
- First wash happens on the next available service day after subscribing.

### 4.2 Add-ons (one-off extras booked onto a scheduled wash)

| Add-on | Price |
| --- | --- |
| Deep interior clean | EGP 350 |
| Hand wax & polish | EGP 450 |
| Tire shine | EGP 80 |
| Seat fabric shampoo | EGP 500 |

### 4.3 Compound-centric scheduling

- Each compound has **2 service days per week** (Premium customers are washed on both).
- Each service day has a **capacity** = assigned washers × `WASHES_PER_WASHER_PER_DAY` (default **14**, assumption).
- Customers on Essential/Plus pick **one** of their compound's service days as their weekly day. Premium uses both.
- A day that is full shows as "Full — join waitlist" and cannot be selected.
- Service window shown to customers: **8:00 AM – 2:00 PM** (assumption).

### 4.4 Rules

| Rule | Value |
| --- | --- |
| Skip a single wash | Allowed until 8:00 PM the day before; skipped washes are not refunded but credited as one free add-on (tire shine) — keep it simple and visible |
| Pause subscription | 1–4 weeks, max once per 3 months; billing pauses too |
| Reschedule weekly day | Allowed to any other service day of the same compound with capacity; takes effect next week |
| Rain / weather | Admin can mark a day "Weather delay"; affected washes move to the next service day automatically |
| Damage claims | Reported within 24 h of the wash; status flow: Submitted → Under review → Resolved |
| Ratings | Optional, 1–5 stars + quick tags after each wash |
| Referral | Each customer has a code; new subscriber and referrer each get 1 free week |

---

## 5. Data model

Create `src/types/domain.ts` with these types (adjust names if needed, keep the meaning):

```ts
type ID = string;

interface Compound {
  id: ID;
  name: string;              // fictional
  area: string;              // e.g. "New Cairo", "Sheikh Zayed", "6th of October"
  serviceDays: Weekday[];    // exactly 2, e.g. ["tue", "sat"]
  washerIds: ID[];           // 1–3
  parkingZones: string[];    // e.g. ["Basement B1", "Basement B2", "Zone A villas"]
  managerName: string;       // fictional
  partnershipSince: string;  // ISO date
  status: "active" | "pilot" | "onboarding";
}

interface Washer {
  id: ID;
  name: string;
  phone: string;             // obviously fake format, e.g. "+20 10 0000 0123"
  photoInitials: string;     // avatar uses initials, no real faces
  idVerified: boolean;       // always true in demo
  joinedAt: string;
  rating: number;            // 4.3–4.95
  compoundIds: ID[];
}

interface Customer {
  id: ID;
  name: string;
  phone: string;
  compoundId: ID;
  unit: string;              // "Building 14, Apt 3" or "Villa 27"
  referralCode: string;
  referredBy?: ID;
  joinedAt: string;
  notificationPrefs: { whatsapp: boolean; push: boolean };
}

interface Car {
  id: ID;
  customerId: ID;
  make: string; model: string; year: number;
  color: CarColor;           // limited palette used by the SVG illustration
  plate: string;             // Egyptian-style placeholder, e.g. "ق ط ر 4821" may be shown as "QTR 4821"
  bodyType: "sedan" | "hatchback" | "suv" | "pickup";
  parkingZone: string;
  parkingSpot: string;       // "Spot 14"
  notes?: string;            // "Covered with a car cover on weekends"
}

interface Subscription {
  id: ID;
  customerId: ID;
  carId: ID;
  plan: "essential" | "plus" | "premium";
  weeklyDays: Weekday[];     // 1 day, or 2 for premium
  status: "active" | "paused" | "cancelled" | "pending_payment";
  startedAt: string;
  pausedUntil?: string;
  cancelAt?: string;
  monthlyPrice: number;      // after family discount
  paymentMethod: "card" | "wallet" | "instapay" | "cash";
}

interface Wash {
  id: ID;
  subscriptionId: ID;
  carId: ID;
  compoundId: ID;
  washerId: ID;
  scheduledDate: string;     // ISO date
  type: "exterior" | "exterior_interior";
  addOns: AddOnId[];
  status: "scheduled" | "washer_on_site" | "in_progress" | "completed" | "skipped" | "missed" | "weather_delayed";
  startedAt?: string;
  completedAt?: string;
  beforePhotoSeed?: number;  // drives the SVG illustration
  afterPhotoSeed?: number;
  checklist?: Record<ChecklistItem, boolean>;
  rating?: { stars: 1|2|3|4|5; tags: string[]; comment?: string };
  washerNote?: string;       // "Small pre-existing scratch on rear bumper"
}

interface Payment {
  id: ID; customerId: ID; subscriptionId?: ID;
  amount: number; method: Subscription["paymentMethod"];
  status: "paid" | "due" | "overdue" | "refunded";
  date: string; description: string;
}

interface Issue {
  id: ID; customerId: ID; washId?: ID; compoundId: ID;
  type: "missed_wash" | "quality" | "damage" | "billing" | "other";
  description: string;
  status: "submitted" | "under_review" | "resolved";
  createdAt: string; resolvedAt?: string;
  resolutionNote?: string;
}

interface Notification {
  id: ID; customerId: ID; createdAt: string; read: boolean;
  kind: "reminder" | "washer_on_site" | "wash_done" | "payment" | "issue_update" | "promo";
  title: string; body: string; link?: string;
}

type ChecklistItem =
  | "exterior_body" | "windows" | "wheels_rims" | "mirrors"
  | "interior_vacuum" | "dashboard" | "floor_mats" | "photos_taken";
```

---

## 6. Mock data specification

Generator lives in `src/data/generate.ts`, uses a seeded PRNG, and returns the full initial state. Unit-test that two runs produce identical output.

### 6.1 Compounds (exactly 10, fictional)

Spread across three areas. Suggested names (fictional — keep fictional):

| Name | Area | Service days | Status |
| --- | --- | --- | --- |
| Palm Grove Residence | New Cairo | Tue, Sat | active |
| Cedar Heights | New Cairo | Sun, Wed | active |
| Lotus Gardens | New Cairo | Mon, Thu | active |
| Oasis Park | Sheikh Zayed | Tue, Fri | active |
| Jasmine Hills | Sheikh Zayed | Sat, Wed | active |
| Olive Court | Sheikh Zayed | Sun, Thu | active |
| Sycamore Square | 6th of October | Mon, Fri | active |
| Nile Crest | 6th of October | Tue, Sat | active |
| Amber Villas | New Cairo | Wed, Sat | pilot |
| Willow Bay | Sheikh Zayed | Sun, Thu | onboarding |

### 6.2 Customers, cars, subscriptions

- Each compound gets a random number of customers **between 25 and 50** (total ≈ 375).
- ~15% of customers have 2 cars (family plan discount applied to the second).
- Plan mix: Essential 45%, Plus 40%, Premium 15%.
- Subscription status mix: active 88%, paused 5%, cancelled 5%, pending_payment 2%.
- Payment method mix: card 35%, wallet 25%, InstaPay 25%, cash 15%.
- Use realistic Egyptian first and last names (mixed male/female) from a local list of ~60 first names and ~60 last names.
- Cars: common models in Egypt, e.g. Hyundai Elantra, Kia Sportage, Nissan Sunny, Toyota Corolla, MG ZS, Chery Tiggo 7, Mercedes C-Class, BMW X3, Skoda Octavia, Peugeot 3008, Chevrolet Optra, Jeep Compass. Colors from the limited palette (white, silver, black, grey, dark blue, red, beige).
- Distribute weekly days so no service day exceeds capacity; leave **at least one day nearly full** (1–3 spots left) and one compound day **full** so the waitlist UI is visible.

### 6.3 Washers

- 9 washers, each assigned to 1–2 compounds; larger compounds get 2 washers.
- Ratings between 4.3 and 4.95.

### 6.4 History (relative to today)

- Generate the **past 10 weeks** of washes for active subscriptions.
- Outcomes: completed 93%, skipped by customer 4%, missed by company 1.5%, weather-delayed 1.5%.
- 55% of completed washes have a rating; average ≈ 4.6, with a few 2–3 star ratings carrying tags like "Missed a spot", "Late".
- Generate **today's** washes for compounds whose service day is today, in mixed states (some completed, one in progress, one washer on site, rest scheduled). If today is not a service day for any compound, shift one compound's service day to today *in the generated data only* so the live view always has activity.
- Generate the **next 2 weeks** of scheduled washes.
- 18–25 issues total: mostly quality and missed washes, 2 damage claims (one resolved, one under review), a few billing.
- Payments: one per subscription per month for the last 3 months; a handful overdue.
- Subscriber growth over the last 6 months for the admin chart: start ~40 subscribers, grow to the current total with a realistic S-curve; mark compounds' partnership dates accordingly.

### 6.5 The default demo customer

Create one hand-written customer used as the logged-in persona in Customer view:

- **Name:** Nour Hassan, Palm Grove Residence, Building 14, Apt 3
- **Car:** white Hyundai Elantra 2022, Basement B1, Spot 14
- **Plan:** Plus, weekly day Tuesday, paid by card
- **History:** 9 completed washes, 1 skipped, all with photos; one 3-star rating with tag "Late"; one resolved quality issue
- **Next wash:** the next Tuesday (or today if today is Tuesday, in state `washer_on_site`)

Also provide a **"New customer" mode** that starts the onboarding flow from scratch (for interviews).

---

## 7. App structure and navigation

### 7.1 Entry: Demo launcher (`/#/`)

A clean landing screen with:

- Brand logo + one-line value proposition: **"Your car, washed every week in your own parking spot."**
- Four large cards: **Customer app**, **Washer app**, **Operations dashboard**, **Compound manager portal**, each with one sentence explaining who it is for.
- Secondary actions: **Start as a new customer** (interview mode), **Reset demo data**.
- Footer note: "Interactive demo with fictional data."

### 7.2 Demo toolbar

A small floating, collapsible toolbar (bottom-left, semi-transparent) visible on every screen except when **Presentation mode** is on:

- Switch role (Customer / Washer / Admin / Compound manager)
- Switch customer persona (Nour Hassan / New customer)
- **Simulate next step** (advances today's washes one step: scheduled → on site → in progress → completed with photos), so you can show the live flow during a demo
- Toggle **Presentation mode** (hides the toolbar; restore with a long-press on the logo or keyboard shortcut `Shift+D`)
- Reset demo

### 7.3 Phone frame

On screens wider than 600 px, render Customer and Washer views inside a centered phone frame (390 × 844, rounded corners, subtle shadow) on a soft neutral background. On real phones, render full-screen without the frame.

### 7.4 Routes

```
/                                  Demo launcher
/customer/welcome                  Welcome (new customer)
/customer/onboarding/:step         Onboarding steps 1–7
/customer/home                     Home
/customer/washes                   Wash history
/customer/washes/:washId           Wash detail (before/after, checklist, rating)
/customer/schedule                 Upcoming washes, skip, pause, change day
/customer/cars                     My cars (add second car)
/customer/addons                   Add-on store
/customer/notifications            Notification centre
/customer/support                  Help, FAQ, chat, report a problem
/customer/support/report           Report a problem / damage
/customer/account                  Profile, plan, payment method, referral, cancel

/washer/today                      Today's route
/washer/wash/:washId               Wash flow (step-by-step)
/washer/summary                    End-of-day summary
/washer/profile                    Washer profile

/admin                             Overview dashboard
/admin/schedule                    Daily schedule board
/admin/compounds                   Compounds table
/admin/compounds/:id               Compound detail
/admin/customers                   Customers table
/admin/customers/:id               Customer detail
/admin/washers                     Washers table
/admin/issues                      Issues queue
/admin/payments                    Payments

/manager                           Compound manager portal (pick compound on first visit)
/manager/:compoundId               Portal home
```

Customer view uses a **bottom tab bar** with 4 tabs: Home, Schedule, Washes, Account. Notifications bell and support icon live in the top bar.

Washer view uses a bottom tab bar: Today, Summary, Profile.

Admin uses a **left sidebar** (collapsible on tablet). Compound manager uses a simple top navigation.

---

## 8. Screen-by-screen specification

### 8.1 Customer — onboarding (interview mode)

A progress bar at the top shows "Step X of 7". One clear primary button per screen, pinned to the bottom. Back arrow always available. Never more than 3 inputs on a screen.

1. **Welcome**
   - Headline: "Your car, washed every week in your own parking spot."
   - Three benefit rows with icons: "No queues, no driving" · "Photos after every wash" · "Vetted washers approved by your compound".
   - Primary: "Get started". Secondary text link: "I already have an account" (goes to the Nour persona).
2. **Phone number**
   - Egyptian format input with +20 prefix, pre-filled demo number. "Send code".
   - OTP screen: 4 boxes, a visible hint "Demo code: 1234", auto-advance when complete.
3. **Your compound**
   - Searchable list of the active and pilot compounds with area labels. Selecting one shows a confirmation card: "Palm Grove Residence · Wash days: Tuesday & Saturday".
   - Compounds in `onboarding` status show "Coming soon — join waitlist".
   - Then unit input: building/villa number and apartment.
4. **Your car**
   - Make (searchable select), model, year, colour (visual swatches), plate (optional), parking zone (select from compound's zones), parking spot.
   - Live preview: the SVG car illustration updates to the chosen colour and body type.
5. **Choose your plan**
   - Three plan cards stacked vertically, Plus highlighted "Most popular". Each card: name, price per month large, 2–3 bullet inclusions, "≈ EGP X per wash" small line to make value obvious.
   - Below cards: "Cancel anytime · Pause when you travel · No hidden fees".
6. **Choose your wash day**
   - Shows the compound's two service days as large cards with the next date, time window "8:00 AM – 2:00 PM", and capacity: "6 spots left", "Full — join waitlist" (disabled).
   - Premium users see both days auto-selected with an explanation.
   - Optional add-ons for the first wash (collapsible, unchecked by default).
7. **Review & pay**
   - Summary card: compound, unit, car, plan, wash day, first wash date, add-ons, monthly total, "Billed today, renews on [date]".
   - Payment method radio: Card, Mobile wallet, InstaPay, Cash on first wash.
   - Card selected → read-only pre-filled demo card fields + banner "Demo — no payment is processed".
   - Trust strip: shield icon "Damage protection: if anything happens during a wash, we cover it" · "Washers are ID-verified and approved by your compound".
   - Primary: "Subscribe — EGP 950/month".
8. **Success**
   - Checkmark animation (subtle, ≤ 600 ms), "You're all set, [name]!", next wash date card, "Add to calendar" (generates an .ics download), "Go to home".

### 8.2 Customer — Home

Top to bottom:

1. Greeting with first name and compound name.
2. **Next wash card** (most prominent element): date, day, time window, car, plan type, status chip. Actions: "Skip this wash", "Add extras".
3. **Live status** (only on wash day) — a vertical timeline replacing GPS tracking:
   - "Washer arrived at Palm Grove · 9:05 AM" → "Washing your car now" → "Done — see photos".
   - Washer card: initials avatar, name, "ID verified" badge, rating. Button "Message on WhatsApp" (opens a `wa.me` link to a fake demo number, or shows a toast "Demo: would open WhatsApp").
4. **Last wash** card with before/after thumbnail, date, and "Rate this wash" if unrated.
5. **Your plan** summary: plan name, washes used this month (e.g. "3 of 4 exterior · 1 of 1 interior"), renewal date.
6. **Refer a neighbour** banner with the code.

### 8.3 Customer — Wash detail

- Large **before/after comparison slider** (drag handle) using the SVG illustrations.
- Tabs or segmented control: "Photos" | "Checklist" | "Details".
- Checklist: completed items with check icons.
- Washer note, if any (e.g. pre-existing scratch noted with a photo marker).
- Rating block: 5 large tappable stars, then quick tags (positive tags for 4–5 stars: "Spotless", "On time", "Friendly"; negative for 1–3: "Missed a spot", "Late", "Water marks", "Interior not cleaned").
- "Report a problem with this wash" link (prefills the report form).

### 8.4 Customer — Schedule

- List of the next 4 upcoming washes, each with date, type, add-ons, and a "Skip" action.
- Skip opens a confirmation sheet: explains the rule (section 4.4) in one sentence; respects the cutoff time (disabled with explanation if past cutoff).
- "Pause subscription" button: bottom sheet with a 1–4 week selector and the resulting resume date and billing effect.
- "Change wash day": shows the compound's other service day with capacity.
- Weather-delayed washes show a cloud icon and the new date.

### 8.5 Customer — Cars (family plan)

- List of cars with illustration, plate and parking spot.
- "Add another car — save 15%" opens the car form + plan picker, shows the discounted price, then a short review/pay step.

### 8.6 Customer — Add-ons store

- Grid of add-on cards with icon, price, short description.
- Select → choose which upcoming wash to attach it to → confirm. Show it on the schedule and the next-wash card.

### 8.7 Customer — Notifications

- Notification centre grouped by Today / Earlier.
- Seed realistic notifications: "Reminder: your car will be washed tomorrow between 8 AM and 2 PM", "Ahmed has arrived at Palm Grove", "Your car is clean — see photos", "Payment received: EGP 950", "Your report has been resolved".
- **Simulated WhatsApp-style message:** when the demo toolbar advances a wash, show an in-app toast that looks like a message preview (green accent, "WhatsApp · now") so interviewees understand they would get WhatsApp updates.
- Preferences toggles: WhatsApp updates, app notifications.

### 8.8 Customer — Support

- FAQ accordion (8 questions): What does a wash include? What if it rains? How do I pause? What if my car is damaged? Do you use water? Who are the washers? How do I cancel? How do I pay?
- **Chat with us**: a simple chat screen with a scripted demo bot: greeting, 4 quick-reply chips (Reschedule, Billing, Report a problem, Talk to a person). "Talk to a person" replies "We'll reply on WhatsApp within 30 minutes (8 AM–8 PM)". Keep it clearly scripted; no AI.
- "Report a problem" form: type (radio), related wash (select, prefilled when coming from wash detail), description, optional photo (mock upload that shows a placeholder thumbnail), submit → success screen with reference number and expected response time "within 24 hours".
- List of the customer's past reports with status chips.

### 8.9 Customer — Account

- Profile (name, phone, compound, unit), editable inline.
- Plan & billing: current plan, change plan (shows prorated note), payment method, payment history list.
- Referral: code, share button (Web Share API with fallback copy-to-clipboard), referral count.
- Cancel subscription: a **two-step, honest** flow: reason picker (Too expensive, Moving, Quality, Not using it, Other), offer to pause instead, final confirmation stating the end date. No dark patterns.
- "Demo: reset to new customer" link at the bottom (hidden in presentation mode).

### 8.10 Washer view

Design for one-handed use outdoors: extra-large buttons (min 56 px height), high contrast, minimal text.

- **Today:** header with compound(s) for today, progress "8 of 14 done", and cars grouped by parking zone, sorted in a walking order. Each row: car illustration thumbnail, model + colour, plate, spot, plan type, add-ons badges, status.
- **Wash flow** (full-screen stepper):
  1. Find car — spot, zone, notes, plate.
  2. Before photo — big "Take photo" button (mock: shows the dirty illustration).
  3. Pre-existing damage? — "No damage" / "Mark damage" (tap on car outline to drop a marker + note).
  4. Checklist — items for the wash type plus add-on items, all must be checked.
  5. After photo — mock capture shows the clean illustration.
  6. Complete — confirmation; triggers the customer notification and updates admin metrics.
- Skip/flag actions: "Car not found", "Car covered", "Customer asked to skip" → creates an issue or a skipped wash.
- **Summary:** washes done, average time per wash, ratings received this week, issues flagged.
- **Profile:** name, ID verified badge, assigned compounds, rating.

### 8.11 Admin (operations dashboard)

Persistent "Demo data — illustrative only" badge in the header.

- **Overview**
  - KPI cards: Active subscribers, Monthly recurring revenue (EGP), Washes this week (done/scheduled), On-time completion %, Average rating, Open issues, Monthly churn %.
  - Charts: subscriber growth (6 months, line), washes per day (last 14 days, bars), revenue by plan (bar, not pie), subscribers by compound (horizontal bars).
  - "Today" panel: each compound active today with progress bar and washer names.
- **Schedule board:** date picker; columns per compound active that day; cards per wash with status colours; filter by washer; "Mark weather delay" action for a compound-day (moves washes to the next service day and sends notifications).
- **Compounds:** table (name, area, status, subscribers, capacity used % per service day, washers, avg rating, MRR). Detail page: service days with capacity bars, parking zones, washers, subscribers list, issues, manager contact, partnership date.
- **Customers:** searchable/filterable table (compound, plan, status). Detail: cars, subscription, wash history, payments, issues, notes.
- **Washers:** table with compounds, washes this week, avg time, rating, issues.
- **Issues queue:** Kanban-style 3 columns (Submitted / Under review / Resolved), filter by type; open an issue in a side sheet; change status and add a resolution note (updates the customer's view).
- **Payments:** table with filters (status, method), totals at top; overdue highlighted.

### 8.12 Compound manager portal

Purpose: reassure the compound that it stays in control. Calm, minimal, read-mostly.

- Compound picker on first visit (remembers choice).
- **This week:** service days, time window, washers authorized to enter (initials avatar, name, ID verified, phone), expected number of cars per day.
- **Washer access log** (mock): entry/exit times for the last 2 weeks.
- **Resident satisfaction:** average rating, number of washes, complaints this month and their resolution status (no customer names, only unit-level anonymised references, e.g. "Building 14").
- **Rules agreed with the compound:** hours, water-free method, parking zones, contact person — displayed as a clear list with an "Request a change" button (opens a mock form).
- **Monthly report:** "Download PDF" can be mocked as a toast for the demo, or render a printable page using the browser's print dialog.

---

## 9. Design system

### 9.1 Principles

1. **Trust first:** prices always visible and final; no surprises; every promise (photos, damage protection, cancel anytime) visible before payment.
2. **One primary action per screen.**
3. **Plain language:** short sentences, no jargon, no exclamation-mark overload.
4. **Calm visuals:** generous white space, soft surfaces, restrained colour; colour carries meaning (status), not decoration.
5. **Large, forgiving touch targets:** ≥ 48 px in customer view, ≥ 56 px in washer view.

### 9.2 Tokens (define in Tailwind config + CSS variables)

| Token | Value | Use |
| --- | --- | --- |
| Primary | Deep teal-blue, e.g. `#0E5E8C` (adjust for AA contrast) | Primary buttons, active tabs |
| Primary soft | Primary at ~8% on white | Selected cards, highlights |
| Success | Green, e.g. `#1F8A5B` | Completed, paid |
| Warning | Amber, e.g. `#B7791F` | Due soon, nearly full |
| Danger | Red, e.g. `#C0392B` | Missed, overdue, damage |
| Info | Blue | In progress, on site |
| Background | `#F7F8FA` | App background |
| Surface | `#FFFFFF` | Cards |
| Border | `#E5E7EB` | Card borders, dividers |
| Text primary | `#111827` | Body |
| Text secondary | `#6B7280` | Supporting text |

- Radius: 12 px cards, 10 px buttons, full for chips.
- Shadow: one soft level only (cards), no heavy shadows or gradients.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32.
- Typography (Inter): body 16 px, small 14 px, never below 13 px; headings 20 / 24 / 28 px semibold; prices tabular numerals.
- Status chips: icon + text + colour (never colour alone).
- Support `prefers-reduced-motion`; animations ≤ 250 ms except the success check.
- Optional dark mode is **out of scope**.

### 9.3 Components to build (in `src/components/ui` and `src/components/app`)

Button (primary/secondary/ghost/destructive, loading state), Card, StatusChip, PriceTag, PlanCard, DayCapacityCard, ProgressSteps, BottomSheet, Toast (including WhatsApp-style variant), EmptyState, Skeleton, StarRating, BeforeAfterSlider, CarIllustration, Timeline, KPI card, DataTable (sortable, filterable, paginated), PhoneFrame, DemoToolbar, DemoBadge.

### 9.4 Car illustrations (before/after photos)

Build `CarIllustration` as an SVG component with props: `bodyType`, `color`, `state: "dirty" | "clean"`, `seed`.

- Side view silhouette per body type (sedan, hatchback, SUV, pickup), wheels, windows.
- `dirty`: muted body colour, a dust/mud layer (seeded random specks and a darker lower band), dull windows.
- `clean`: full colour, subtle highlight streaks, a few sparkle marks, clean windows.
- Background: parking-garage setting (floor line, pillar), so it reads as "your parking spot".
- Must look polished and consistent; this is the visual proof of the service in the demo.
- Also support replacing illustrations with real photos later: if `public/photos/{carId}-before.jpg` is configured in `src/config/photos.ts`, use it instead.

### 9.5 Copy tone

Friendly, calm, confident. Examples:

- Good: "Your car will be washed on Tuesday between 8 AM and 2 PM."
- Bad: "🚗✨ Get ready for an AMAZING shine!!!"

Error messages say what happened and what to do: "That day is full. Choose Saturday or join the Tuesday waitlist."

### 9.6 Empty, loading and error states

Every list has an empty state with an icon and one sentence. Simulate brief loading (300–500 ms skeletons) only on initial screen loads to feel realistic; never on every tap.

---

## 10. State management

- One Zustand store `useDemoStore` with slices: `compounds`, `washers`, `customers`, `cars`, `subscriptions`, `washes`, `payments`, `issues`, `notifications`, `session` (current role, persona, presentation mode).
- Persist to `localStorage` under a versioned key (`lamaa-demo-v1`); if the version changes, regenerate.
- Selectors for derived data in `src/lib/selectors.ts` (capacity per compound-day, KPIs, MRR, churn, on-time %).
- All business rules as **pure functions** in `src/lib/rules.ts` (can skip? capacity left? next service date? pause effects? price with family discount? weather delay rescheduling?). Unit-test each.
- Actions update state consistently across roles: completing a wash in Washer view updates Customer home, notifications, and Admin metrics immediately.

---

## 11. Usability-test helper (recommended addition)

Because the demo will be used in interviews, add a lightweight **session recorder** (local only):

- When "Start as a new customer" is used, record timestamps for each onboarding step and each tap on a primary/back button.
- On completion or abandon, store a session summary in `localStorage`: total time, time per step, back-button presses, plan chosen, payment method chosen, day chosen.
- Admin → "Interview sessions" page (hidden behind the demo toolbar): table of sessions + "Export JSON".
- Nothing is sent anywhere. Show a tiny note on the welcome screen in interview mode: "This demo records only which screens you used, on this device."

This lets you see where people hesitate, which is more reliable than asking them.

---

## 12. Accessibility and quality bar

- WCAG AA colour contrast; visible focus states; all interactive elements reachable by keyboard; labels on all inputs; `aria-live` for toasts.
- Lighthouse (mobile) on the customer home: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95.
- No console errors or warnings in the browser.
- Works in latest Chrome, Safari (iOS) and Firefox.
- Bundle: lazy-load the admin and manager sections so the customer view loads fast on phones.

---

## 13. Project structure

```
src/
  app/                 router, layouts (CustomerLayout, WasherLayout, AdminLayout, ManagerLayout)
  config/              business.ts (plans, prices, capacity), photos.ts, brand.ts
  data/                generate.ts, names.ts, cars.ts, compounds.ts, prng.ts
  types/               domain.ts
  store/               demoStore.ts
  lib/                 rules.ts, selectors.ts, format.ts (EGP, dates), ics.ts, sessionRecorder.ts
  components/ui/       shadcn components + Button, Card, etc.
  components/app/      PlanCard, CarIllustration, BeforeAfterSlider, Timeline, DemoToolbar, ...
  features/
    launcher/
    customer/          onboarding/, home/, schedule/, washes/, cars/, addons/, notifications/, support/, account/
    washer/
    admin/
    manager/
tests/
  unit/                rules, selectors, generator determinism
  e2e/                 customer-onboarding.spec.ts
```

Currency formatting: `EGP 1,250` (no decimals). Dates: "Tue, 18 Nov" in lists, "Tuesday, 18 November" on detail cards. Times: 12-hour with AM/PM.

---

## 14. Build phases (execute in order)

Each phase ends with: typecheck, lint, tests, build all passing, then a commit.

### Phase 0 — Setup
- Vite + React + TS (strict), Tailwind, shadcn/ui, Inter font, ESLint, Prettier, Vitest, Playwright, HashRouter.
- `src/config/brand.ts` with name "Lamaa", tagline, a simple wordmark (text logo + droplet/sparkle icon from lucide).
- Create `DECISIONS.md` and a minimal `README.md`.
- **Done when:** blank app runs, all scripts work.

### Phase 1 — Design system
- Tokens, base components (section 9.3 except BeforeAfterSlider/CarIllustration), PhoneFrame, layouts, a hidden `/#/styleguide` page showing every component and state.
- **Done when:** styleguide shows all components in all states on mobile and desktop.

### Phase 2 — Domain, data and rules
- Types, seeded generator (section 6), store with persistence and reset, rules and selectors with unit tests (capacity, skip cutoff, next service date, family discount, pause, weather delay, KPIs).
- **Done when:** generator is deterministic (tested), ≈ 375 customers across 10 compounds, all rule tests pass.

### Phase 3 — Car illustrations and before/after slider
- `CarIllustration` (4 body types × 7 colours × dirty/clean), `BeforeAfterSlider` with mouse, touch and keyboard support.
- **Done when:** styleguide shows a grid of all variants and the slider works on touch.

### Phase 4 — Launcher, demo toolbar, routing shells
- Launcher, DemoToolbar (role switch, persona switch, simulate next step, presentation mode, reset), all route shells with placeholder content.
- **Done when:** every route renders; presentation mode hides all demo controls.

### Phase 5 — Customer onboarding
- Section 8.1 complete, including capacity-aware day selection, waitlist state, demo payment, success + .ics download, and the session recorder (section 11).
- **Done when:** a new customer can subscribe end-to-end in under 2 minutes; the new subscription appears in Admin and in the compound's capacity.

### Phase 6 — Customer core
- Home with live status timeline, wash history, wash detail with slider, checklist, rating; schedule (skip, pause, change day, weather-delayed display).
- **Done when:** the Nour persona's data is complete and every action updates state correctly.

### Phase 7 — Customer extras
- Cars/family plan, add-ons store, notifications centre + WhatsApp-style toasts, support (FAQ, scripted chat, report a problem, report list), account (profile, plan change, payment history, referral, honest cancel flow).
- **Done when:** every customer route is fully functional; no dead buttons.

### Phase 8 — Washer app
- Today route grouped by parking zone, full wash flow stepper with damage marking, flags, summary, profile.
- **Done when:** completing a wash in Washer view immediately shows photos and a notification in Customer view and updates Admin.

### Phase 9 — Admin dashboard
- Overview KPIs + charts + today panel, schedule board with weather delay, compounds (list + detail), customers (list + detail), washers, issues Kanban with side sheet, payments, interview sessions page.
- **Done when:** all numbers are derived from the store (no hard-coded KPIs), demo badge visible on every page.

### Phase 10 — Compound manager portal
- Section 8.12 complete, anonymised resident data, printable monthly report.
- **Done when:** a compound manager can understand who enters, when, and how residents rate the service, on one screen.

### Phase 11 — Polish
- Copy review against section 9.5; empty/loading/error states everywhere; micro-interactions; accessibility pass; Lighthouse targets; test on 390 px, 768 px, 1280 px, 1440 px widths.
- Fix anything that feels complex for a first-time user: count taps for the onboarding flow and remove any unnecessary one.
- **Done when:** section 12 quality bar is met.

### Phase 12 — Tests
- Unit tests for all rules/selectors (aim for full coverage of `rules.ts`).
- Component tests: PlanCard, DayCapacityCard (full/nearly full), StarRating, BeforeAfterSlider keyboard.
- One Playwright E2E: new customer subscribes → sees next wash on home → advance via toolbar → sees completed wash with photos → rates it.
- **Done when:** all tests pass locally and in CI.

### Phase 13 — Deployment
- GitHub Actions workflow: on push to `main` → install, typecheck, lint, test, build, deploy to GitHub Pages. Set Vite `base` correctly for the repo name.
- Add a QR code generator page at `/#/share` showing a QR of the deployed URL (useful for interviews).
- **Done when:** the live URL works on a real phone, including after a reload (state persists).

### Phase 14 — Documentation
- `README.md`: what the demo is, screenshots of the 4 views, how to run, how to change prices/capacity in `business.ts`, how the demo toolbar works, the "fictional data" disclaimer, architecture overview (one diagram), and a short "Engineering decisions" section (why frontend-only, why Zustand, why HashRouter, why GitHub Pages).
- Finalise `DECISIONS.md`.
- **Done when:** a stranger can clone, run and understand the project in 10 minutes.

---

## 15. Out of scope (do not build)

- Backend, database, APIs, real authentication, real payments, real notifications or WhatsApp integration
- Arabic / RTL and any i18n framework
- GPS / map-based live tracking (replaced by the on-site status timeline)
- Native mobile apps
- Dark mode
- Real analytics or any tracking that leaves the device

---

## 16. Final acceptance checklist

- [ ] All four roles work end-to-end from the launcher
- [ ] New customer can subscribe in under 2 minutes on a phone
- [ ] Before/after photos look polished and consistent
- [ ] Completing a wash in Washer view updates Customer and Admin instantly
- [ ] Capacity, waitlist, skip cutoff, pause and weather delay all behave per section 4
- [ ] Every admin/manager screen shows the "Demo data — illustrative only" badge
- [ ] No real compound names, no real card inputs, no network calls
- [ ] Presentation mode hides every demo control
- [ ] Reset restores the identical initial state
- [ ] Lighthouse and accessibility targets met
- [ ] All tests pass; CI deploys to GitHub Pages
- [ ] README and DECISIONS complete
