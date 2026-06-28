<div align="center">

# Ledger

**A personal finance tracker built for daily PG life.**

[![Svelte](https://img.shields.io/badge/Svelte-5.x-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://svelte.dev)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.x-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://kit.svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<br/>

> Log expenses in under 3 seconds. Understand where your money goes. Works offline. Syncs across devices.

</div>

---

## Pages

| Route | What it does |
|---|---|
| `/` | **Dashboard**: Month Health Card, Insights Strip, weekly spend chart, budget overview, upcoming EMIs, lent money card, recent transactions, contextual month-end and new-month banners |
| `/transactions` | Browse, edit, and delete all transactions grouped by day with month navigation |
| `/budgets` | Per-category budgets with progress bars, rings, and pace warnings. Auto-rolled over each new month |
| `/emis` | EMI tracker with loan progress, due-date countdown, and paid/remaining breakdown |
| `/subscriptions` | Subscription tracking (tab within the EMI section) |
| `/reports` | Monthly donut chart, category breakdown bars, calendar heatmap for daily spend. Navigate any past month |
| `/lent` | Lent money tracker: log amounts lent, record partial repayments, track outstanding balance per person |
| `/wrapped` | Spending DNA with yearly or monthly stats, biggest transaction, favourite payment mode, spending personality |
| `/settings` | Monthly income, Categories link, Dashboard Banner toggles, CSV export, data reset |
| `/categories` | Manage categories: add new, inline rename/edit (icon, colour, name), hide or show |

---

## Features

### Month Health Card
The hero element on the dashboard answers "how am I tracking this month?" at a glance:
- **Total spent** this month with an animated count-up
- **Progress bar** coloured green, orange, or red as you approach your income or budget limit
- **Left to spend**: how much you have remaining
- **Month-end pace**: projects your end-of-month total based on your current daily burn rate, with a warning triangle when you are over-pacing
- **Today**: labelled Spent and Earned chips so today's activity is always visible
- **Month-end nudge** (last 3 days): card gains an amber accent stripe, the days-left pill turns amber, and a "Full recap →" link to Reports appears — no duplicate numbers, just a visual cue

### Insights Strip
Auto-computed insights shown below the Month Health Card. No guesswork, pure arithmetic on your transaction data:
- Budget exceeded or about to run out in the next few days
- Category bought 3 or more days in a row (streak detection)
- Spending up or down 15%+ compared to last week
- Hidden automatically when there is nothing worth surfacing

### Quick Add
Tap the **+** button anywhere to open the transaction sheet:

**Mobile (bottom sheet):**
- Swipe-down drag handle to dismiss
- Type toggle (Expense / Income) always visible at the top
- Large numpad for fast amount entry — numpad never moves regardless of panel open
- Three context pills: **Category**, **Date**, **Details** — tap any pill to swap the active panel below
- **Category panel**: emoji grid of all active categories, scrollable; empty state links to /categories
- **Date panel**: horizontal chip strip (Today / Yesterday / day abbreviations / Older); selecting "Older" opens the OS native date picker; selected date shown as a large formatted card below the chips
- **Details panel**: UPI / Cash / Card / Net buttons + optional note field (100-char limit with countdown)
- Save button always anchored at the bottom, shows `· ₹3,500` confirmation when a valid amount is entered
- Keyboard shortcuts on desktop: digits type amount, Backspace deletes, Enter saves, Escape closes

**Desktop (centred modal, 700 px wide):**
- Left column: amount display + numpad
- Right column: all panels (category grid, date chips, payment & note) always visible and scrollable — no pill-switching needed
- Full-width type toggle header and save button footer

### New Month Welcome Card
On days 1–3 of a new month, a card appears above the Month Health Card showing the previous month's summary: total spent, savings (if income was logged), top spending category, and transaction count, with a link to the full report. Dismissed per month; can be disabled in Settings.

### Interactive Charts
All charts support hover on desktop and tap-to-pin on mobile:
- **Weekly Spend Chart**: day-by-day breakdown for the selected week. Each bar shows the total; navigate back through previous weeks with arrow buttons
- **Month Donut**: category spend breakdown (Reports). Tap a segment to see the name, amount, and percentage; tap again to reveal the last 8 transactions for that category inline
- **Daily Spend Heatmap** (Reports): a full-month calendar grid coloured by spend intensity — green for light days, orange for above average, red for the heaviest. Tap any cell for the exact amount

### Budgets
- Set a monthly budget per category
- Progress bars colour-coded: green (safe), orange (80 %+), red (over)
- **Pace warning** on each card: "On track at ₹X/day", "Runs out in ~3 days", or "Over by X %"
- **Auto-rollover**: if no budgets exist for the new month, last month's budgets are copied automatically on app start

### EMI and Subscription Tracker
- Track loans: principal, monthly EMI, total months, paid months, next due date
- Track subscriptions: name, monthly cost, renewal date
- Due-date countdown and repayment progress ring

### Lent Money Tracker
- Log money lent to a person with an optional note and date
- Record partial or full repayments over time
- See total lent, total recovered, and outstanding balance at a glance
- Dashboard card shows outstanding count and amount when someone still owes you

### Categories
- Add new categories with a custom emoji icon and colour
- Inline rename/edit: tap the pencil icon on any active category to expand a form — change name, icon, colour — with live preview and duplicate-name validation
- Hide categories to remove them from Quick Add without deleting history
- Show hidden categories to restore them

### Reports
- Navigate any past month with left and right arrows
- Income vs Expense vs Net summary cards
- Category donut with drill-down to individual transactions
- Full category breakdown with proportional bars
- Daily spend heatmap for the selected month

### Spending DNA (`/wrapped`)
- Switch between This Month and This Year
- Total income, expenses, savings rate
- Transaction count and biggest single spend
- Favourite payment mode
- Spending personality: The Saver, The Foodie, The Commuter, The Explorer, The Shopaholic, The Self-Care Guru, or The Balanced One

### Settings
- **Monthly Income**: set income to power the health card progress bar and savings calculations
- **Categories**: shortcut to the Categories management page
- **Dashboard Banners**: toggle the month-end nudge and new-month welcome card independently
- **Export as CSV**: download all transactions as a UTF-8 CSV file
- **Reset All Data**: wipe all transactions, budgets, EMIs, lends, and settings (with confirmation); default categories are re-seeded

### Sync and Offline
- All data lives in **IndexedDB** (Dexie.js) for instant reads and writes that work offline
- Every write syncs to **Firebase Firestore** in the background, silently
- On every app load, the latest data is pulled from Firestore into IndexedDB
- Single-user, last-write-wins with no conflict resolution needed

---

## Default Categories

Pre-seeded for PG life. Fully customisable (add, edit, reorder) in Settings → Categories.

| Icon | Category | Icon | Category |
|---|---|---|---|
| 🏠 | PG Rent | 💆 | Personal Care |
| 🍽️ | Food & Dining | 🎬 | Entertainment |
| 🛒 | Groceries | 🛍️ | Shopping |
| 🚗 | Transport | 📦 | Moving/Setup |
| 📱 | Recharge | ⚡ | Electricity |
| 🌐 | Internet | 💊 | Medicine |
| 🧃 | Juice | 🤝 | Lent Money |
| 💰 | Salary | 📌 | Miscellaneous |

---

## UX Design Principles

| Law | Applied as |
|---|---|
| **Fitts's Law** | Large FAB at bottom-centre for easy thumb reach. Hero spend number is the biggest element on the page |
| **Hick's Law** | Quick Add shows amount and three context pills; all fields accessible but secondary ones are behind a tap |
| **Miller's Law** | Category grid limited to a scrollable panel; 4 columns on mobile, 5 on desktop |
| **Jakob's Law** | Familiar bottom-nav pattern, card-based layouts, standard sheet interactions, iOS-style toggle switches |
| **Progressive Disclosure** | Month Health Card reveals: hero, bar, stats, today strip, each with a staggered fly-in; Quick Add details behind Details pill |
| **Von Restorff Effect** | Warning triangle only appears when you are genuinely over-pacing, never for decoration; amber pill only in last 3 days |
| **Zeigarnik Effect** | Budget bars are always incomplete, keeping spending awareness active |
| **Peak-End Rule** | Green checkmark animation plays when a transaction is saved |
| **Gestalt Similarity** | Category colours are consistent across every page, chart, and tooltip |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Svelte 5 (Runes: `$state`, `$derived`, `$effect`) |
| Meta-framework | SvelteKit 2.x |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS 4.x |
| Icons | @lucide/svelte |
| Charts | layerchart |
| Local storage | Dexie.js 4.x (IndexedDB) |
| Cloud sync | Firebase Firestore 12.x |
| Analytics | Vercel Analytics + Speed Insights |
| Deployment | Vercel (adapter-auto) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) >= 18
- npm >= 9
- A free [Firebase](https://firebase.google.com) project with Firestore enabled

### Installation

```bash
git clone https://github.com/sudo-Harshk/ledger.git
cd ledger
npm install
cp .env.example .env.local
# fill in your Firebase credentials in .env.local
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values from your Firebase project settings:

```
PUBLIC_FIREBASE_API_KEY=...
PUBLIC_FIREBASE_PROJECT_ID=...
PUBLIC_FIREBASE_APP_ID=...
```

For production, add the same three variables in your Vercel project's Environment Variables settings.

---

## Available Scripts

```bash
npm run dev        # Start dev server at http://localhost:5173
npm run build      # Production build to ./build
npm run preview    # Preview production build locally
npm run check      # TypeScript and Svelte type checking
```

---

## Database Schema

Stored locally in IndexedDB via Dexie.js and synced to Firebase Firestore.

```
transactions  ->  id, type, amount, categoryId, note, paymentMode, date, createdAt
categories    ->  id, name, icon, color, sortOrder, isActive
budgets       ->  id, categoryId, amount, month (YYYY-MM)
emis          ->  id, type, name, principal, monthlyAmount, startDate, totalMonths, paidMonths, nextDueDate, categoryId, notes
lends         ->  id, personName, amount, date, note, repayments (array of { id, amount, date }), createdAt
settings      ->  key, value
```

---

## Sync Architecture

```
Write:   UI -> IndexedDB (instant) -> Firestore (background, fire-and-forget)
Read:    App start -> Firestore pull -> IndexedDB -> reactive state
Offline: Writes go to IndexedDB only; auto-synced on next write when online
```

Last-write-wins. Single-user app so conflicts do not occur in practice.

---

## Deployment

Connect the GitHub repo to Vercel. Add the three `PUBLIC_FIREBASE_*` environment variables in Vercel project settings. Every push to `main` deploys automatically via `adapter-auto`.
