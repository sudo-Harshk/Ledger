# Ledger App

A modern, Japanese-inspired React web app for managing student attendance and calculating monthly fees, with real-time updates, role-based dashboards, and beautiful UI for students and teachers.

 **Live Demo:** [https://ledger-90834.web.app/](https://ledger-90834.web.app/)

---

## Features

### Student Dashboard
- **Daily Attendance:** Mark attendance with beautiful calendar interface
- **Payment Tracking:** Monitor monthly fees and payment status
- **Progress Visualization:** Track approved days and attendance history
- **Real-time Updates:** Live sync with teacher approvals

### Teacher Dashboard
- **Attendance Management:** Approve/reject student attendance requests
- **Bulk Operations:** Add bulk attendance for multiple students
- **Student Management:** Create and manage student accounts
- **Revenue Tracking:** View financial summaries and payment status
- **Fee Management:** Set and adjust monthly fees

### Security & Authentication
- **Firebase Auth:** Secure authentication with role-based access
- **No Self-Registration:** Only teacher-created users can access
- **Google Integration:** Optional Google login for easier access
- **App Check:** reCAPTCHA v3 protection against abuse

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

## Tech Stack

### Core Framework
- **React 19** - Modern React with hooks and concurrent features
- **TypeScript** - Type safety and enhanced developer experience
- **Vite** - Lightning-fast build tool and dev server

### Backend & Database
- **Firebase Auth** - Secure authentication and user management
- **Firestore** - Real-time NoSQL database with live updates
- **Firebase App Check** - Protection against abuse and unauthorized access

### UI & Styling
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible UI components
- **Lucide React** - Modern icon library
- **Custom Japanese-inspired Design** - Unique color palette and typography

### Performance & Optimization
- **React Hot Toast** - Elegant notifications
- **Canvas Confetti** - Celebration effects
- **Date-fns** - Lightweight date utilities
- **Code Splitting** - Lazy loading for optimal performance

### Development Tools
- **ESLint** - Code quality and consistency
- **TypeScript ESLint** - TypeScript-specific linting rules
- **Vite Plugins** - React and TypeScript support

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

## Development

### Prerequisites
- Node.js 18+ 
- Firebase project with Auth & Firestore enabled
- Git for version control

### Environment Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env` file with Firebase configuration
4. Set up Firestore indexes (see Firebase Setup section)
5. Run development server: `npm run dev`
