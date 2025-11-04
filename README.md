# Ledger App

Japanese‑inspired attendance and fee management for students and teachers. Real‑time Firestore sync, role‑based dashboards, and a clean Tailwind UI.

**Live demo**: `https://ledger-90834.web.app/`

---

## What you can do

- **Students**: mark daily attendance, track approved days, view monthly fees/payment status.
- **Teachers**: approve/reject attendance (real‑time), add bulk attendance, manage students, configure monthly fees and recalculate when needed, view revenue summaries, complete initial setup.
- **Theming**: one‑click theme switcher with 5 curated palettes; preference persists.
- **Security**: Firebase Auth + Firestore rules; App Check via reCAPTCHA v3; no self‑registration.

---

## Tech stack

- **Frontend**: React 19, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui, Radix primitives, Lucide icons, tailwind-animate
- **Data & Auth**: Firebase Auth, Firestore, App Check
- **UX**: react-hot-toast for notifications, date-fns, canvas-confetti

---

## Quick start

1) Prerequisites
- Node.js 18+
- Firebase project with Auth + Firestore enabled

2) Install
```bash
git clone <repository-url>
cd ledger-app
npm install
```

3) Environment variables (.env at repo root)
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_RECAPTCHA_V3_SITE_KEY=your_recaptcha_v3_site_key
VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=your_debug_token   # dev only

# Optional
VITE_ENABLE_ADMIN_SETUP=true            # enable first‑time admin setup flow
VITE_PLATFORM_START=2025-08-01         # disallow attendance before this date
```

4) Firebase setup
- Enable Email/Password Auth
- Create Firestore database
- Deploy rules and indexes (see below)
- Optional: App Check (reCAPTCHA v3)

5) Run
```bash
npm run dev
```
Open `http://localhost:5173`

---

## Firestore indexes

Create the following composite indexes in Firestore:
- attendance-status-studentId-date: `status`, `studentId`, `date`, `__name__` (asc)
- attendance-studentId-date: `studentId`, `date`, `__name__` (asc)

See Firestore Console → Indexes. You can also deploy indexes via:

```bash
firebase deploy --only firestore:indexes
```

---

## Admin setup (first account)

Create an admin user in Firebase Auth, then set their Firestore user document role to `admin`:
1. In Firestore, open collection `users` and the document matching the admin UID.
2. Add/update field `role` = `admin`.
3. Sign in as this user and access the admin dashboard.

Never commit credentials or sensitive IDs. For CLI‑driven updates, prefer environment‑scoped tooling and least‑privilege accounts.

---

## Scripts

- `npm run dev` — start dev server
- `npm run build` — type‑check and build for production
- `npm run preview` — preview the production build
- `npm run deploy` — build and deploy to Firebase Hosting
- `npm run lint` — run ESLint

---

## Deployment

Configured for Firebase Hosting.

```bash
npm run deploy                    # build + hosting deploy
# or, granular:
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

SPA routing is handled by Firebase Hosting. Build output goes to `dist`.

---

## Security & roles

- App Check via reCAPTCHA v3 (configure keys in `.env`).
- Students access only their own data; teachers/admins manage platform data.
- Strict Firestore rules (`firestore.rules`).
- No public sign‑up — accounts are created by teachers/admins.

