import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_APP_ID,
} from '$env/static/public';

const config = {
  apiKey:    PUBLIC_FIREBASE_API_KEY,
  projectId: PUBLIC_FIREBASE_PROJECT_ID,
  appId:     PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length
  ? getApps()[0]
  : PUBLIC_FIREBASE_PROJECT_ID
    ? initializeApp(config)
    : null;

export const firestore = firebaseApp ? getFirestore(firebaseApp) : null;
