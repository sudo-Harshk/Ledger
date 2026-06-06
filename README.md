<div align="center">

# Ledger

**A personal finance tracker with cross-device sync.**

[![Svelte](https://img.shields.io/badge/Svelte-5.x-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://svelte.dev)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.x-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://kit.svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<br/>

> Track daily expenses, set budgets, monitor EMIs, and understand your spending patterns.
> Data syncs across devices via Firebase Firestore and is stored locally in IndexedDB for instant offline access.

</div>

---

## Features

| Feature | Description |
|---|---|
| **Quick Add** | Log any expense in under 3 seconds — numpad + single category tap |
| **Dashboard** | Today's spend, weekly bar chart, month budget progress, recent transactions |
| **Transactions** | Browse, edit, delete — grouped by day with monthly navigation |
| **Budgets** | Per-category budget tracking with colour-coded progress bars |
| **EMI Tracker** | Track loans and subscriptions with due-date countdowns and repayment progress |
| **Reports** | Monthly donut chart, daily trend bars |
| **Settings** | Manage categories, set monthly income, export CSV, toggle light/dark theme |
| **Cross-device sync** | All writes sync to Firebase Firestore in the background; pull on every app load |

---

## UX Design Principles

| Law | Applied as |
|---|---|
| **Fitts's Law** | Large FAB at bottom-centre — easiest thumb reach on any phone |
| **Hick's Law** | Quick Add shows only amount + category. Details hidden behind an expand toggle |
| **Miller's Law** | Maximum 8 categories visible in the picker grid at once |
| **Jakob's Law** | Familiar bottom-nav pattern, card-based layouts |
| **Progressive Disclosure** | Note, date, payment mode — only shown when the user asks |
| **Zeigarnik Effect** | Budget bars are always incomplete — unfinished loops drive awareness |
| **Peak-End Rule** | Green checkmark animation plays when an expense is saved |
| **Gestalt Similarity** | Category colours are consistent across every page |

---

## Default Categories

Pre-seeded for PG life (fully customisable in Settings):

PG Rent, Food & Dining, Groceries, Transport, Phone & Net, Personal Care, Entertainment, Shopping, Moving/Setup, Salary, Miscellaneous

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Svelte 5 (Runes) |
| Meta-framework | SvelteKit 2.x |
| Language | TypeScript |
| Styling | Tailwind CSS 4.x |
| Icons | @lucide/svelte |
| Local storage | Dexie.js (IndexedDB) |
| Cloud sync | Firebase Firestore |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) >= 18
- npm >= 9
- A free [Firebase](https://firebase.google.com) project with Firestore enabled

### Installation

```bash
git clone https://github.com/your-username/ledger.git
cd ledger
npm install
cp .env.example .env.local
# fill in your Firebase credentials in .env.local
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Environment Variables

Copy `.env.example` to `.env.local` and set the three values from your Firebase project settings:

```
PUBLIC_FIREBASE_API_KEY=...
PUBLIC_FIREBASE_PROJECT_ID=...
PUBLIC_FIREBASE_APP_ID=...
```

For production, set these same variables in your Vercel project's Environment Variables settings.

---

## Available Scripts

```bash
npm run dev           # Start dev server  ->  http://localhost:5173
npm run build         # Production build  ->  ./build
npm run preview       # Preview production build locally
npm run check         # TypeScript + Svelte type checking
```

---

## Database Schema

Data is stored locally in IndexedDB via Dexie.js and synced to Firebase Firestore.

```
transactions  ->  id, type, amount, categoryId, note, paymentMode, date, createdAt
categories    ->  id, name, icon, color, sortOrder, isActive
budgets       ->  id, categoryId, amount, month (YYYY-MM)
emis          ->  id, name, principal, monthlyAmount, startDate, totalMonths, paidMonths, nextDueDate
settings      ->  key, value  (monthlyIncome)
```

---

## Sync Architecture

```
Write:  UI -> IndexedDB (instant) -> Firestore (background, fire-and-forget)
Read:   App start -> Firestore pull -> IndexedDB -> reactive state
Offline: Writes go to IndexedDB only; Firestore sync retries on next write
```

Last-write-wins. Since this is a single-user app, conflicts do not occur in practice.

---

## Privacy

Your data is tied to your Firebase project. Anyone who opens this app from GitHub or Vercel gets their own empty app — they cannot see your data. The Firebase API key is a client-side identifier, not a secret; access is controlled by Firestore security rules.

---

## Deployment

Connect the GitHub repo to Vercel. Add the three `PUBLIC_FIREBASE_*` environment variables in Vercel project settings. Every push to main deploys automatically.
