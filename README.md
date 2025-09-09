# Ledger App - Student Attendance & Fee Management

A React-based web application for managing student attendance and calculating monthly fees based on approved attendance records.

## Features

- **Student Dashboard**: Mark daily attendance, view calendar, track approved days
- **Teacher Dashboard**: Approve/reject attendance, set monthly fees, view revenue
- **Authentication**: Secure login/signup with Firebase Auth
- **Real-time Updates**: Firestore database for live data synchronization
- **Responsive Design**: Modern UI with smooth animations and hover effects

## Student Dashboard Data Refresh

- The Student Dashboard now fetches updated data only when the student logs in or clicks the refresh button.
- The due amount updates immediately after marking attendance—no need to refresh twice.
- There is no longer a continuous/interval-based refresh for students.

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase project with Authentication and Firestore enabled

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd ledger-app
npm install
```

### 2. Firebase Configuration

Create a `.env` file in the root directory with your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Important**: Replace the placeholder values with your actual Firebase project configuration from the Firebase Console.

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Authentication (Username/Password)
4. Enable Firestore Database
5. Set up Firestore security rules (see `firestore.rules` file)
6. Get your project configuration from Project Settings > General

### 4. Firestore Security Rules

Update your Firestore security rules to match the ones in `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /attendance/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. Run the Application

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 6. Firestore Indexes (Required)

To ensure the app works correctly, you must create the following composite indexes in your Firebase Firestore database:

#### 1. Attendance Index by Status, Student, and Date
- **Index Name:** `attendance-status-studentId-date`
- **Collection ID:** `attendance`
- **Fields to Index (in order, all ascending):**
  - `status`
  - `studentId`
  - `date`
  - `__name__`

#### 2. Attendance Index by Student and Date
- **Index Name:** `attendance-studentId-date`
- **Collection ID:** `attendance`
- **Fields to Index (in order, all ascending):**
  - `studentId`
  - `date`
  - `__name__`

**How to Create These Indexes:**
1. Go to the [Firestore Indexes page](https://console.firebase.google.com/) in your Firebase project.
2. Click **Add Index**.
3. For each index above, select the `attendance` collection and add the fields in the specified order (all set to ascending).
4. Optionally, give each index a name as shown above for easy reference.

> **Note:** The field `__name__` refers to the document ID and is usually added automatically when creating composite indexes.

## Usage

### For Students

1. **Sign Up**: Create a new student account
2. **Mark Attendance**: Click "Mark Today" to record daily attendance
3. **View Calendar**: See your attendance status for each day
4. **Track Fees**: Monitor your monthly fee calculation

### For Teachers

1. **Set Monthly Fee**: Configure the monthly fee for all students
2. **Approve Attendance**: Review and approve/reject student attendance requests
3. **View Revenue**: See total revenue based on approved attendance

## Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth)
├── pages/              # Page components
├── firebase.ts         # Firebase configuration
└── main.tsx           # App entry point
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Environment Variables

The following environment variables are required in your `.env` file:

```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_RECAPTCHA_V3_SITE_KEY=your_recaptcha_v3_site_key
VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=your_debug_token # (for development only)
VITE_ENABLE_ADMIN_SETUP=true # (optional, enables admin teacher setup)
```

## Firebase App Check & Security

- The app uses **Firebase App Check** with reCAPTCHA v3 to protect backend resources from abuse.
- You must set up App Check in the Firebase Console and obtain a reCAPTCHA v3 site key.
- Add your site key to the `.env` file as `VITE_RECAPTCHA_V3_SITE_KEY`.
- In development, you can use a debug token (`VITE_FIREBASE_APPCHECK_DEBUG_TOKEN`).

## Authentication & User Roles

- **Students** log in with their username. **Teachers** log in with their email.
- Teachers can create new student accounts from the Teacher Dashboard.
- If a user exists in Firebase Auth but not in Firestore, login will fail and the user will be signed out.
- Role-based dashboards: students and teachers see different features and permissions.

## Role-Based Access & Firestore Security

- Firestore security rules enforce strict role-based access:
  - Students can only read and update their own data.
  - Teachers can manage all student accounts and attendance.
- See `firestore.rules` for details.

## Bulk Attendance (Teacher Feature)

- Teachers can add bulk attendance for all students over a date range.
- Firestore batch size limit: 500 records per batch. Large operations are split into multiple batches.
- Bulk attendance UI provides quick presets (last 7 days, this month, today).

## Admin/Teacher Setup

- If no teacher exists, the Teacher Dashboard will prompt for initial admin teacher setup (if `VITE_ENABLE_ADMIN_SETUP` is true).
- The admin teacher account is created with email and password and gets the `teacher` role.

## Notification System

- All user notifications use the `react-hot-toast` library for consistent, non-blocking toasts.
- Success, error, and info messages are shown for all major actions.

## UI/UX Notes

- Built with Tailwind CSS and shadcn/ui for a modern, responsive interface.
- No scale-up hover animations are used for UI elements.
- Calendar and dashboard are optimized for both desktop and mobile.

## Project Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint for code quality
- `npm run preview` - Preview production build

## Contributing

Contributions are welcome! To contribute:
- Fork the repository and create a new branch for your feature or fix.
- Run `npm run lint` before submitting a pull request.
- Follow the existing code style and structure.
- If adding a new feature, update the README and add documentation as needed.

## License

This project is licensed under the MIT License.
