# Ledger App

A modern, Japanese-inspired React web app for managing student attendance and calculating monthly fees, with real-time updates, role-based dashboards, and beautiful UI for students and teachers.

---

## Features
- **Student Dashboard:** Mark daily attendance, view calendar, track approved days, monitor monthly fees, see payment status
- **Teacher Dashboard:** Approve/reject attendance, set monthly fees, view revenue, add bulk attendance, manage students, mark payments
- **Authentication:** Secure login/signup with Firebase Auth (only teacher-created users can access; no self-registration)
- **Real-time Sync:** Firestore for live data, real-time updates
- **Notifications:** Uses `react-hot-toast` for all user messages
- **Role-based Access:** Students and teachers see different dashboards and permissions
- **Google Account Linking:** Optional Google login for easier access
- **Admin Setup:** Initial teacher account setup (if enabled)
- **Clean Architecture:** Modular components with custom hooks and barrel file imports

---

## Quick Start

### 1. Prerequisites
- Node.js v18+
- npm or yarn
- Firebase project (with Auth & Firestore enabled)

### 2. Setup
```bash
git clone <repository-url>
cd ledger-app
npm install
```

### 3. Firebase Configuration
- Create a `.env` file in the root:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_RECAPTCHA_V3_SITE_KEY=your_recaptcha_v3_site_key
VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=your_debug_token # (dev only)
VITE_ENABLE_ADMIN_SETUP=true # (optional)
VITE_PLATFORM_START=2025-08-01 # (optional, restricts attendance before this date)
```
- Get these values from your Firebase Console (Project Settings > General).

### 4. Firebase Setup
- Enable Email/Password Auth
- Enable Firestore Database
- Set Firestore security rules (see `firestore.rules`)
- [Optional] Set up App Check with reCAPTCHA v3

### 5. Firestore Indexes
Create these composite indexes in Firestore:
- **attendance-status-studentId-date:** `status`, `studentId`, `date`, `__name__` (all ascending)
- **attendance-studentId-date:** `studentId`, `date`, `__name__` (all ascending)

See Firestore > Indexes in Firebase Console.

### 6. Run the App
```bash
npm run dev
```
Visit [http://localhost:5173](http://localhost:5173)

---

## Usage

### Students
1. Sign in with your teacher-provided account
2. Mark daily attendance
3. View attendance calendar and payment status
4. Track monthly fees and due dates

### Teachers
1. Set monthly fee
2. Approve/reject attendance
3. Add bulk attendance for students
4. View revenue and student payment status
5. Create/manage student accounts
6. Mark student payments as paid

---

## Main Libraries
- **React 19** - Modern React with hooks
- **TypeScript** - Type safety and better DX
- **Firebase (Auth, Firestore, AppCheck)** - Backend and authentication
- **Firestore onSnapshot** — Real-time data fetching and live updates
- **react-hot-toast** — User notifications
- **framer-motion** — Animations
- **canvas-confetti** — Confetti effect
- **tailwindcss** & **shadcn/ui** — Styling & UI components
- **lucide-react** — Icons
- **date-fns** — Date utilities

---

## Scripts
- `npm run dev` — Start dev server
- `npm run build` — Build for production
- `npm run preview` — Preview production build
- `npm run lint` — Run ESLint

---

## Security & Roles
- **App Check:** Uses reCAPTCHA v3 (see `.env`)
- **Students:** Log in with username, access only their data
- **Teachers:** Log in with email, manage all students
- **Role-based dashboards**
- **Firestore rules:** Strict access control (see `firestore.rules`)
- **No self-registration:** Only teacher-created users can access

---

## Development Notes

### Code Quality
- **ESLint** configured for code quality
- **TypeScript** for type safety
- **Absolute imports** with `@/` alias
- **Barrel files** for clean imports
- **Custom hooks** for reusable logic
- **Error boundaries** and global error handling

### Performance
- **Real-time updates** with Firestore listeners
- **Optimized re-renders** with React hooks
- **Code splitting** with Vite
- **Lazy loading** for better performance

---

## Contributing
- Fork & branch for your feature/fix
- Run `npm run lint` before PR
- Follow the established architecture patterns
- Use custom hooks for business logic
- Keep components focused and small
- Update docs if needed

---

## License
MIT