// --- ADD THESE DEBUG LOGS ---
console.log("==============================");
console.log("LEDGER APP DEBUG LOGS");
console.log("Vite Mode:", import.meta.env.MODE);
console.log("Project ID:", import.meta.env.VITE_FIREBASE_PROJECT_ID);
console.log("reCAPTCHA Site Key:", import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY);
console.log("API Key:", import.meta.env.VITE_FIREBASE_API_KEY);
console.log("Auth Domain:", import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
console.log("Storage Bucket:", import.meta.env.VITE_FIREBASE_STORAGE_BUCKET);
console.log("Messaging Sender ID:", import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID);
console.log("App ID:", import.meta.env.VITE_FIREBASE_APP_ID);
console.log("App Check Debug Token:", import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN);
console.log("==============================");
// -----------------------------

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import logger from './lib/logger'
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Check if environment variables are available
const checkEnvVar = (name: string, defaultValue?: string) => {
  const value = import.meta.env[name];
  if (!value && !defaultValue) {
    logger.error(`Missing required environment variable: ${name}`);
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || defaultValue;
};

const firebaseConfig = {
  apiKey: checkEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: checkEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: checkEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: checkEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: checkEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: checkEnvVar('VITE_FIREBASE_APP_ID'),
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Add this after imports

declare global {
  interface Window {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
  }
}

// Enable App Check debug mode in development
if (!import.meta.env.PROD) {
  window.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;
}

// Initialize App Check with reCAPTCHA v3 in all environments
if (import.meta.env.MODE !== 'staging') {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(checkEnvVar('VITE_RECAPTCHA_V3_SITE_KEY')),
    isTokenAutoRefreshEnabled: true,
  });
} else {
  console.log("App Check disabled for staging environment");
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// Add error handling for Firebase initialization
auth.onAuthStateChanged((user) => {
  if (user) {
    logger.info('Firebase Auth initialized successfully');
    console.log("AUTH DEBUG: User authenticated:", {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName
    });
  } else {
    console.log("AUTH DEBUG: No user authenticated");
  }
}, (error) => {
  logger.error('Firebase Auth initialization error');
  console.error("AUTH DEBUG: Auth state change error:", error);
});