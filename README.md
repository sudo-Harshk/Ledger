<div align="center">

# Ledger

**A offline-first personal finance tracker  built for real life.**

[![Svelte](https://img.shields.io/badge/Svelte-5.x-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://svelte.dev)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.x-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://kit.svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Dexie.js](https://img.shields.io/badge/Dexie.js-4.x-FF6B35?style=for-the-badge)](https://dexie.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<br/>

> Track daily expenses, set budgets, monitor EMIs, and understand your spending patterns —
> fully offline, optionally synced to your own Turso Cloud database.

</div>

---

##  Features

| Feature | Description |
|---|---|
| ** Quick Add** | Log any expense in under 3 seconds — numpad + single category tap |
| ** Dashboard** | Today's spend, weekly bar chart, month budget progress, recent transactions |
| ** Transactions** | Browse, search, edit, delete — grouped by day with monthly navigation |
| ** Budgets** | Per-category SVG donut rings, colour-coded alerts (green → yellow → red) |
| ** EMI Tracker** | Track loans & subscriptions with due-date countdowns and repayment progress |
| ** Reports** | Monthly donut chart, daily trend bars, month-over-month comparison |
| ** Settings** | Manage categories, set income, export CSV, configure Turso Cloud sync |
| ** Offline-First** | All data stored locally in IndexedDB — zero internet required |
| ** Turso Sync** | Optional one-tap backup to your own Turso Cloud database |

---

##  UX Design Principles

Every interaction is grounded in established UX laws:

| Law | Applied as |
|---|---|
| **Fitts's Law** | Large FAB at bottom-centre — easiest thumb reach on any phone |
| **Hick's Law** | Quick Add shows only amount + category. Details hidden behind an expand toggle |
| **Miller's Law** | Maximum 8 categories visible in the picker grid at once |
| **Jakob's Law** | Familiar bottom-nav pattern, card-based layouts |
| **Progressive Disclosure** | Note, date, payment mode — only shown when the user asks |
| **Zeigarnik Effect** | Budget rings are always incomplete circles — unfinished loops drive awareness |
| **Peak-End Rule** | Green ✓ animation plays when an expense is saved — satisfying close to the action |
| **Gestalt Similarity** | Category colours are consistent across every page |

---

##  Default Categories

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

##  Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Svelte (Runes) | 5.x |
| Meta-framework | SvelteKit | 2.x |
| Language | TypeScript | 6.x |
| Build tool | Vite | 8.x |
| Styling | Tailwind CSS | 4.x |
| Icons | @lucide/svelte | 1.x |
| Local storage | Dexie.js (IndexedDB) | 4.x |
| Cloud sync | @libsql/client (Turso) | 0.17.x |

---

##  Getting Started

### Prerequisites

| Requirement | Version |
|---|---|
| [Node.js](https://nodejs.org) | ≥ 18 |
| npm | ≥ 9 (bundled with Node.js) |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/ledger.git
cd ledger

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser.

No backend, no account, no config needed — it just works.

---

## Turso Cloud Sync (Optional)

Ledger works fully offline by default. To enable cloud backup:

**Step 1 — Create a free Turso account**

```bash
# Install the Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Log in
turso auth login
```

**Step 2 — Create your database**

```bash
turso db create ledger
```

**Step 3 — Get your credentials**

```bash
turso db show ledger --url       # copy the libsql:// URL
turso db tokens create ledger    # copy the auth token
```

**Step 4 — Connect in the app**

Open **Settings → Turso Cloud Sync**, paste your URL and token, then tap **Sync Now**.

> Your data syncs to your own Turso database. No third party has access to your financial data.

---

## Available Scripts

```bash
npm run dev           # Start dev server  →  http://localhost:5173
npm run build         # Production build  →  ./build
npm run preview       # Preview production build locally
npm run check         # TypeScript + Svelte type checking
npm run check:watch   # Type checking in watch mode
```

---

## Database Schema

All data is stored locally in **IndexedDB** via [Dexie.js](https://dexie.org). No server required.

```
transactions  →  id · type · amount · categoryId · note · paymentMode · date · createdAt
categories    →  id · name · icon · color · sortOrder · isActive
budgets       →  id · categoryId · amount · month (YYYY-MM)
emis          →  id · name · principal · monthlyAmount · startDate · totalMonths · paidMonths · nextDueDate
settings      →  key · value  (monthlyIncome, tursoUrl, tursoToken)
```

---

##  Deployment

Ledger is a static SPA and deploys anywhere that serves HTML files.

<details>
<summary><strong>Vercel</strong></summary>

```bash
npm install -D @sveltejs/adapter-vercel
```

Update `svelte.config.js`:
```js
import adapter from '@sveltejs/adapter-vercel';
export default { kit: { adapter: adapter() } };
```

```bash
npx vercel deploy
```
</details>

<details>
<summary><strong>Netlify</strong></summary>

```bash
npm run build
# Drag-and-drop the build/ folder to netlify.com/drop
```

Or connect your GitHub repo in the Netlify dashboard — it auto-detects SvelteKit.
</details>

<details>
<summary><strong>GitHub Pages / Any Static Host</strong></summary>

```bash
npm install -D @sveltejs/adapter-static
```

Update `svelte.config.js`:
```js
import adapter from '@sveltejs/adapter-static';
export default { kit: { adapter: adapter({ fallback: 'index.html' }) } };
```

```bash
npm run build
# Deploy the build/ folder to your host
```
</details>

---

## Contributing

Contributions, ideas, and bug reports are welcome!
Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.


