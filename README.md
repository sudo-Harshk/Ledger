# Ledger App

A modern, Japanese-inspired React web app for managing student attendance and calculating monthly fees, with real-time updates, role-based dashboards, and beautiful UI for students and teachers.

 **Live Demo:** [https://ledger-90834.web.app/](https://ledger-90834.web.app/)

---

## Features

### Theme Customization
- **5 Beautiful Themes:** Choose from Warm Cream, Sage Green, Ocean Breeze, Vintage Warm, or Desert Sunset
- **One-Click Switching:** Theme button in footer for instant changes
- **Persistent Preferences:** Your theme choice is saved across sessions
- **Seamless Design:** All components adapt automatically to the selected theme

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

## Theme System

Ledger App features a flexible theme system that allows you to switch between 5 beautiful color palettes. The theme switcher is available in the footer for all authenticated users.

### Available Themes

1. **Warm Cream (Default)**
   - Japanese-inspired warm palette
   - Perfect for a calm, welcoming atmosphere
   - Colors: Golden accents, cream backgrounds

2. **Sage Green**
   - Calm sage green palette
   - Colors: `#96A78D`, `#B6CEB4`, `#D9E9CF`, `#F0F0F0`
   - Ideal for a peaceful, nature-inspired feel

3. **Ocean Breeze**
   - Calm teal and mint palette
   - Colors: `#19183B`, `#708993`, `#A1C2BD`, `#E7F2EF`
   - Fresh, modern ocean-inspired design

4. **Vintage Warm**
   - Muted earth tones palette
   - Colors: `#B6AE9F`, `#C5C7BC`, `#DEDED1`, `#FBF3D1`
   - Elegant, timeless aesthetic

5. **Desert Sunset**
   - Warm terracotta palette
   - Colors: `#B77466`, `#FFE1AF`, `#E2B59A`, `#957C62`
   - Warm, inviting desert-inspired theme

### How to Use the Theme System

#### For Users
Simply click the theme button in the footer and select your preferred theme. Your choice will be saved and persist across sessions.

#### For Developers

**To Switch Themes Programmatically:**
```typescript
// Add theme class to document element
document.documentElement.classList.add('theme-sage'); // for sage theme
document.documentElement.classList.remove('theme-sage'); // to remove

// Available theme classes:
// - theme-sage (Sage Green)
// - theme-ocean (Ocean Breeze)
// - theme-vintage (Vintage Warm)
// - theme-desert (Desert Sunset)
// - (none) for default Warm Cream theme
```

**Adding a New Theme:**
1. Add CSS variables in `src/index.css` under a new theme class (e.g., `.theme-custom`)
2. Update the `Theme` type in `src/components/ThemeSwitcher.tsx`
3. Add the theme to the `themes` array with label, description, and color preview
4. Update theme detection and application logic

**Color Variable Structure:**
Each theme should define these CSS variables:
- `--palette-dark-teal` - Headers and borders
- `--palette-light-cream` - Main background
- `--palette-golden` - Accents and buttons
- `--palette-deep-red` - Primary actions
- `--palette-dark-red` - Text and emphasis
- Plus background, card, and input layering variables

### Theme Persistence
User theme preferences are automatically saved to `localStorage` and restored on page reload.

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
- **Dynamic Theme System** - Switch between 5 beautiful color themes
- **CSS Variables** - Seamless theme switching with no component changes required

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
