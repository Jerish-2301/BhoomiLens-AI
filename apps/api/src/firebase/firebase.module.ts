// Firebase Admin SDK initialization for the BhoomiLens AI API
// Docs: https://firebase.google.com/docs/admin/setup

import { Module, Global } from '@nestjs/common';
import { initializeApp, cert, applicationDefault, getApps, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

const firebaseConfig = {
  projectId: 'uploading-digital-property',
  storageBucket: 'uploading-digital-property.firebasestorage.app',
};

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_APP',
      useFactory: (): App => {
        const apps = getApps();
        if (apps.length > 0) {
          return apps[0]!;
        }

        const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (serviceAccountPath) {
          return initializeApp({
            credential: cert(serviceAccountPath),
            ...firebaseConfig,
          });
        }

        return initializeApp({
          credential: applicationDefault(),
          ...firebaseConfig,
        });
      },
    },
    {
      provide: 'FIREBASE_AUTH',
      useFactory: (app: App): Auth => getAuth(app),
      inject: ['FIREBASE_APP'],
    },
    {
      provide: 'FIREBASE_FIRESTORE',
      useFactory: (app: App): Firestore => getFirestore(app),
      inject: ['FIREBASE_APP'],
    },
    {
      provide: 'FIREBASE_STORAGE',
      useFactory: (app: App): Storage => getStorage(app),
      inject: ['FIREBASE_APP'],
    },
  ],
  exports: ['FIREBASE_APP', 'FIREBASE_AUTH', 'FIREBASE_FIRESTORE', 'FIREBASE_STORAGE'],
})
export class FirebaseModule {}
