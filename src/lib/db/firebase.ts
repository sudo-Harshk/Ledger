import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_APP_ID,
} from '$env/static/public';

const firebaseApp = getApps().length === 0
  ? initializeApp({
      apiKey:    PUBLIC_FIREBASE_API_KEY,
      projectId: PUBLIC_FIREBASE_PROJECT_ID,
      appId:     PUBLIC_FIREBASE_APP_ID,
    })
  : getApps()[0];

export const firestore = getFirestore(firebaseApp);
