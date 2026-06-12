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
| `/` | **Dashboard** — Month Health Card, weekly bar chart, budget overview, upcoming EMIs, recent transactions |
| `/transactions` | Browse, edit, delete all transactions — grouped by day with month navigation |
| `/budgets` | Per-category budgets with progress bars and rings — auto-rolled over each new month |
| `/emis` | EMI tracker with loan progress, due-date countdown, and paid/remaining breakdown |
| `/subscriptions` | Subscription tracking (tab within the EMI section) |
| `/reports` | Monthly donut chart, category breakdown bars, daily spend trend — navigate any past month |
| `/wrapped` | Spending DNA — yearly or monthly stats, biggest transaction, favourite payment mode, spending personality |
| `/settings` | Monthly income, categories, light/dark theme, CSV export, data reset |

---

## Features

### Month Health Card
The hero element on the dashboard answers "how am I tracking this month?" at a glance:
- **Total spent** this month with an animated count-up
- **Progress bar** — green → orange → red as you approach your income/budget limit
- **Left to spend** — how much you have remaining
- **Month-end pace** — projects your end-of-month total based on your current daily burn rate, with a warning triangle when you're over-pacing
- **Today** — labelled Spent / Earned chips so today's activity is always visible

### Quick Add
Tap the **+** button anywhere → bottom sheet slides up:
- Numpad for fast amount entry
- Category grid (tap once to select)
- Expense / Income toggle
- Collapsible details: note, payment mode (UPI / Cash / Card / Net), date
- Animated ✓ on save

### Interactive Charts
All three charts support hover (desktop) and tap-to-pin (mobile):
- **Weekly Bar Chart** — this week's daily spend with a dashed daily-budget reference line; info bar shows date, amount, and "over by ₹X" when above limit
- **Month Donut** — category spend breakdown; tap a segment or legend item to see icon, name, amount, and % in the donut hole
- **Daily Trend** — every spending day in the month as bars; tap a bar to see the exact date and amount

### Budgets
- Set a monthly budget per category
- Progress bars colour-coded: green (safe) → orange (≥ 80%) → red (over)
- **Auto-rollover**: if you haven't set budgets for the new month, last month's budgets are copied automatically on app start

### EMI & Subscription Tracker
- Track loans: principal, monthly EMI, total months, paid months, next due date
- Track subscriptions: name, monthly cost, renewal date
- Due-date countdown and repayment progress ring

### Reports
- Navigate any past month with ← / → arrows
- Income vs Expense vs Net summary cards
- Category donut with interactive segments
- Full category breakdown with proportional bars
- Daily spend trend for the selected month

### Spending DNA (`/wrapped`)
- Switch between This Month and This Year
- Total income, expenses, savings rate
- Transaction count and biggest single spend
- Favourite payment mode
- Spending personality: The Saver, The Foodie, The Commuter, The Explorer, The Shopaholic, The Self-Care Guru, or The Balanced One

### Sync & Offline
- All data lives in **IndexedDB** (Dexie.js) — instant reads and writes, works offline
- Every write syncs to **Firebase Firestore** in the background, silently
- On every app load, the latest data is pulled from Firestore into IndexedDB
- Single-user, last-write-wins — no conflict resolution needed

---

## Default Categories

Pre-seeded for PG life. Fully customisable (add, edit, reorder) in Settings.

| Icon | Category | Icon | Category |
|---|---|---|---|
| 🏠 | PG Rent | 📱 | Phone & Net |
| 🍽️ | Food & Dining | 💆 | Personal Care |
| 🛒 | Groceries | 🎬 | Entertainment |
| 🚗 | Transport | 🛍️ | Shopping |
| 🧃 | Juice | ⚡ | Electricity |
| 📦 | Moving/Setup | 💰 | Salary |
| 📌 | Miscellaneous | | |

---

## UX Design Principles

| Law | Applied as |
|---|---|
| **Fitts's Law** | Large FAB at bottom-centre — easiest thumb target; hero spend number is the biggest element on the page |
| **Hick's Law** | Quick Add shows only amount + category. Note, date, and payment mode are hidden behind an expand toggle |
| **Miller's Law** | Max 8 categories visible in the picker grid at once |
| **Jakob's Law** | Familiar bottom-nav pattern, card-based layouts, standard sheet interactions |
| **Progressive Disclosure** | Month Health Card reveals: hero → bar → stats → today strip, each with a staggered fly-in |
| **Von Restorff Effect** | Warning triangle (⚠) only appears when you're genuinely over-pacing — never for decoration |
| **Zeigarnik Effect** | Budget bars are always "incomplete" — unfinished loops drive spending awareness |
| **Peak-End Rule** | Green ✓ animation plays when an expense is saved |
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
| ID generation | nanoid |
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
npm run dev        # Start dev server  →  http://localhost:5173
npm run build      # Production build  →  ./build
npm run preview    # Preview production build locally
npm run check      # TypeScript + Svelte type checking
```

---

## Database Schema

Stored locally in IndexedDB via Dexie.js and synced to Firebase Firestore.

```
transactions  →  id, type, amount, categoryId, note, paymentMode, date, createdAt
categories    →  id, name, icon, color, sortOrder, isActive
budgets       →  id, categoryId, amount, month (YYYY-MM)
emis          →  id, type, name, principal, monthlyAmount, startDate, totalMonths, paidMonths, nextDueDate, categoryId, notes
settings      →  key, value
```

---

## Sync Architecture

```
Write:   UI → IndexedDB (instant) → Firestore (background, fire-and-forget)
Read:    App start → Firestore pull → IndexedDB → reactive state
Offline: Writes go to IndexedDB only; auto-synced on next write when online
```

Last-write-wins. Single-user app — conflicts don't occur in practice.

---

## Deployment

Connect the GitHub repo to Vercel. Add the three `PUBLIC_FIREBASE_*` environment variables in Vercel project settings. Every push to `main` deploys automatically via `adapter-auto`.
