// Firebase configuration for the BhoomiLens AI web app
// Docs: https://firebase.google.com/docs/web/setup

import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase project configuration
const firebaseConfig = {
  apiKey: 'AIzaSyAfCDbhUzs7AUzuHhXBTujq-xv-pjxokM8',
  authDomain: 'uploading-digital-property.firebaseapp.com',
  projectId: 'uploading-digital-property',
  storageBucket: 'uploading-digital-property.firebasestorage.app',
  messagingSenderId: '34589325828',
  appId: '1:34589325828:web:5ac601783537ac8ce71351',
  measurementId: 'G-00WNKRRN2V',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics only in browser environments that support it
export const analytics = isSupported().then((supported) =>
  supported ? getAnalytics(app) : null
);

export default app;
