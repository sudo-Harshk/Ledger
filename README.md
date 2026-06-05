<div align="center">

# Ledger

**An offline-first personal finance tracker built for real life.**

[![Svelte](https://img.shields.io/badge/Svelte-5.x-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://svelte.dev)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.x-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://kit.svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Dexie.js](https://img.shields.io/badge/Dexie.js-4.x-FF6B35?style=for-the-badge)](https://dexie.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<br/>

> Track daily expenses, set budgets, monitor EMIs, and understand your spending patterns —
> fully offline. Your data never leaves your device.

</div>

---

## Features

| Feature | Description |
|---|---|
| **Quick Add** | Log any expense in under 3 seconds — numpad + single category tap |
| **Dashboard** | Today's spend, weekly bar chart, month budget progress, recent transactions |
| **Transactions** | Browse, edit, delete — grouped by day with monthly navigation |
| **Budgets** | Per-category budget tracking with colour-coded progress bars |
| **EMI Tracker** | Track loans & subscriptions with due-date countdowns and repayment progress |
| **Reports** | Monthly donut chart, daily trend bars |
| **Settings** | Manage categories, set monthly income, export CSV |
| **Offline-First** | All data stored locally in IndexedDB — zero internet required |

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
| **Peak-End Rule** | Green ✓ animation plays when an expense is saved |
| **Gestalt Similarity** | Category colours are consistent across every page |

---

## Default Categories

Pre-seeded for PG life (fully customisable in Settings):

| | Category | | Category |
|---|---|---|---|
| 🏠 | PG Rent | 📱 | Phone & Net |
| 🍽️ | Food & Dining | 💆 | Personal Care |
| 🛒 | Groceries | 🎬 | Entertainment |
| 🚗 | Transport | 🛍️ | Shopping |
| 📦 | Moving/Setup | 💰 | Salary |
| 📌 | Miscellaneous | | |

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

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) ≥ 18
- npm ≥ 9

### Installation

```bash
git clone https://github.com/your-username/ledger.git
cd ledger
npm install
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser.

No backend, no account, no config needed — it just works.

---

## Available Scripts

```bash
npm run dev           # Start dev server  →  http://localhost:5173
npm run build         # Production build  →  ./build
npm run preview       # Preview production build locally
npm run check         # TypeScript + Svelte type checking
```

---

## Database Schema

All data is stored locally in **IndexedDB** via [Dexie.js](https://dexie.org). Nothing is sent to any server.

```
transactions  →  id · type · amount · categoryId · note · paymentMode · date · createdAt
categories    →  id · name · icon · color · sortOrder · isActive
budgets       →  id · categoryId · amount · month (YYYY-MM)
emis          →  id · name · principal · monthlyAmount · startDate · totalMonths · paidMonths · nextDueDate
settings      →  key · value  (monthlyIncome)
```

---

## Privacy

Your data is stored exclusively in your browser's IndexedDB. Anyone opening this link gets their own empty app — they cannot see your data.

---

## Deployment

Ledger deploys anywhere that serves static files. The recommended option is Vercel — connect your GitHub repo and it deploys automatically on every push.

```bash
npm run build   # output goes to ./build
```
