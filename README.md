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
| `/` | **Dashboard**: Month Health Card, insights strip, weekly spend list, budget overview, upcoming EMIs, lent money card, recent transactions |
| `/transactions` | Browse, edit, and delete all transactions grouped by day with month navigation |
| `/budgets` | Per-category budgets with progress bars, rings, and pace warnings. Auto-rolled over each new month |
| `/emis` | EMI tracker with loan progress, due-date countdown, and paid/remaining breakdown |
| `/subscriptions` | Subscription tracking (tab within the EMI section) |
| `/reports` | Monthly donut chart, category breakdown bars, calendar heatmap for daily spend. Navigate any past month |
| `/lent` | Lent money tracker: log amounts lent, record partial repayments, track outstanding balance per person |
| `/wrapped` | Spending DNA with yearly or monthly stats, biggest transaction, favourite payment mode, spending personality |
| `/settings` | Monthly income, theme toggle, CSV export, data reset |
| `/categories` | Manage categories: add, rename, change icon/color, hide or show |

---

## Features

### Month Health Card
The hero element on the dashboard answers "how am I tracking this month?" at a glance:
- **Total spent** this month with an animated count-up
- **Progress bar** coloured green, orange, or red as you approach your income or budget limit
- **Left to spend**: how much you have remaining
- **Month-end pace**: projects your end-of-month total based on your current daily burn rate, with a warning triangle when you are over-pacing
- **Today**: labelled Spent and Earned chips so today's activity is always visible

### Insights Strip
Auto-computed insights shown below the Month Health Card. No guesswork, pure arithmetic on your transaction data:
- Budget exceeded or about to run out in the next few days
- Category bought 3 or more days in a row (streak detection)
- Spending up or down 15%+ compared to last week
- Hidden automatically when there is nothing worth surfacing

### Quick Add
Tap the **+** button anywhere to open the bottom sheet:
- Numpad for fast amount entry
- Category grid (tap once to select)
- Expense / Income toggle
- Collapsible details: note, payment mode (UPI / Cash / Card / Net), date
- Animated checkmark on save

### Interactive Charts
All charts support hover on desktop and tap-to-pin on mobile:
- **Weekly Spend List**: day-by-day breakdown for the selected week. Each row shows the day, category icons of what you bought, and the total. Navigate back through previous weeks with arrow buttons. Days with no spend show a dash.
- **Month Donut**: category spend breakdown. Tap a segment to see the name, amount, and percentage in the donut hole. Tap again to reveal the last 8 transactions for that category inline below the chart.
- **Daily Spend Heatmap** (Reports): a full-month calendar grid coloured by spend intensity. Green for light days, orange for above average, red for the heaviest days. Tap any cell for the exact amount and context.

### Budgets
- Set a monthly budget per category
- Progress bars colour-coded: green (safe), orange (80%+), red (over)
- **Pace warning** on each card: "On track at Rs X/day", "Runs out in ~3 days", or "Over by X%"
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

### Sync and Offline
- All data lives in **IndexedDB** (Dexie.js) for instant reads and writes that work offline
- Every write syncs to **Firebase Firestore** in the background, silently
- On every app load, the latest data is pulled from Firestore into IndexedDB
- Single-user, last-write-wins with no conflict resolution needed

---

## Default Categories

Pre-seeded for PG life. Fully customisable (add, edit, reorder) in Settings.

| Icon | Category | Icon | Category |
|---|---|---|---|
| 🏠 | PG Rent | 💆 | Personal Care |
| 🍽️ | Food and Dining | 🎬 | Entertainment |
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
| **Hick's Law** | Quick Add shows only amount and category. Note, date, and payment mode are hidden behind an expand toggle |
| **Miller's Law** | Max 8 categories visible in the picker grid at once |
| **Jakob's Law** | Familiar bottom-nav pattern, card-based layouts, standard sheet interactions |
| **Progressive Disclosure** | Month Health Card reveals: hero, bar, stats, today strip, each with a staggered fly-in |
| **Von Restorff Effect** | Warning triangle only appears when you are genuinely over-pacing, never for decoration |
| **Zeigarnik Effect** | Budget bars are always incomplete, keeping spending awareness active |
| **Peak-End Rule** | Green checkmark animation plays when an expense is saved |
| **Gestalt Similarity** | Category colours are consistent across every page, chart, and tooltip |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Svelte 5 (Runes: `$state`, `$derived`, `$effect`) |
| Meta-framework | SvelteKit 2.x |
| Language | TypeScript |
| Styling | Tailwind CSS 4.x |
| Icons | @lucide/svelte |
| Local storage | Dexie.js (IndexedDB) |
| Cloud sync | Firebase Firestore |
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
lends         ->  id, personName, amount, date, note, repayments (array), createdAt
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
