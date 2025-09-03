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

// Initialize App Check with reCAPTCHA v3 in production
if (import.meta.env.PROD) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(checkEnvVar('VITE_RECAPTCHA_V3_SITE_KEY')),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// Add error handling for Firebase initialization
auth.onAuthStateChanged((user) => {
  if (user) {
    logger.info('Firebase Auth initialized successfully');
  }
}, () => {
  logger.error('Firebase Auth initialization error');
});
