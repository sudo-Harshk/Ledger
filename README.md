# Ledger App

Japanese-inspired attendance and fee management for students and teachers. Real-time Firestore sync, role-based dashboards, and a clean Tailwind UI.

**Live demo**: `https://ledger-90834.web.app/`

---

## Features

- **Students**: Mark daily attendance, track approved days, view monthly fees/payment status
- **Teachers**: Approve/reject attendance (real-time), bulk attendance, manage students, configure fees, view revenue summaries
- **Theming**: One-click theme switcher with 5 curated palettes (preference persists)
- **Security**: Firebase Auth + Firestore rules, App Check via reCAPTCHA v3, no self-registration

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Firebase (Auth, Firestore, Cloud Functions, App Check)
- **UX**: react-hot-toast, date-fns, canvas-confetti

---

## Quick Start

### Prerequisites

- Node.js 18+
- Firebase project with Auth + Firestore enabled
- Firebase Blaze plan (required for Cloud Functions)

### Installation

```bash
git clone <repository-url>
cd ledger-app
npm install
cd functions && npm install && cd ..
```

### Environment Variables

Create `.env` at repo root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_RECAPTCHA_V3_SITE_KEY=your_recaptcha_v3_site_key
VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=your_debug_token  # dev only

# Optional
VITE_ENABLE_ADMIN_SETUP=true
VITE_PLATFORM_START=2025-08-01
```

### Firebase Setup

1. Enable Email/Password Auth
2. Create Firestore database
3. Deploy rules, indexes, and functions: `firebase deploy`
4. (Optional) Configure App Check with reCAPTCHA v3

### Firestore Indexes

Create these composite indexes in Firestore Console:

- `status`, `studentId`, `date`, `__name__` (asc) — `attendance-status-studentId-date`
- `studentId`, `date`, `__name__` (asc) — `attendance-studentId-date`

Or deploy via: `firebase deploy --only firestore:indexes`

### Run

```bash
npm run dev
```

Open `http://localhost:5173`

---

## Admin Setup

1. Create an admin user in Firebase Auth
2. In Firestore, open `users` collection → document matching admin UID
3. Add/update field `role` = `admin`
4. Sign in to access admin dashboard

---

## Scripts

- `npm run dev` — Start dev server
- `npm run build` — Build for production
- `npm run preview` — Preview production build
- `npm run deploy` — Build and deploy to Firebase Hosting
- `npm run lint` — Run ESLint

---

## Deployment

### Deploy Everything

```bash
npm run build
firebase deploy
```

### Deploy Individual Services

```bash
# Frontend only
npm run deploy
firebase deploy --only hosting

# Firestore
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes

# Cloud Functions
firebase deploy --only functions

# Multiple services (PowerShell - use quotes)
firebase deploy --only "functions,firestore:rules"
```

---

## Cloud Functions

### `lookupUsername`

Secure callable function for username-to-email lookup during student login.

**Features**: Input validation, generic error messages, minimal data exposure, Admin SDK access

**Deploy**:
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

**Local Development**:
```bash
cd functions
npm run serve
```

---

## Security

- App Check via reCAPTCHA v3
- Role-based access control (students see only their data)
- Strict Firestore rules (no public access to users collection)
- Secure username lookup via Cloud Function
- No public sign-up (accounts created by teachers/admins)
