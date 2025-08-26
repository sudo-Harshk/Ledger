# Ledger App - Student Attendance & Fee Management

A React-based web application for managing student attendance and calculating monthly fees based on approved attendance records.

## 🚀 Features

- **Student Dashboard**: Mark daily attendance, view calendar, track approved days
- **Teacher Dashboard**: Approve/reject attendance, set monthly fees, view revenue
- **Authentication**: Secure login/signup with Firebase Auth
- **Real-time Updates**: Firestore database for live data synchronization
- **Responsive Design**: Modern UI with smooth animations and hover effects

## 🛠️ Setup Instructions

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

## 📱 Usage

### For Students

1. **Sign Up**: Create a new student account
2. **Mark Attendance**: Click "Mark Today" to record daily attendance
3. **View Calendar**: See your attendance status for each day
4. **Track Fees**: Monitor your monthly fee calculation

### For Teachers

1. **Set Monthly Fee**: Configure the monthly fee for all students
2. **Approve Attendance**: Review and approve/reject student attendance requests
3. **View Revenue**: See total revenue based on approved attendance

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth)
├── pages/              # Page components
├── firebase.ts         # Firebase configuration
└── main.tsx           # App entry point
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build


## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
