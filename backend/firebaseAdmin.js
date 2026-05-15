import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// For local development, you would place your serviceAccountKey.json in the backend folder
// DO NOT commit this file to source control.
const serviceAccountPath = path.resolve('./serviceAccountKey.json');

try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized with service account.');
  } else {
    // Fallback or placeholder initialization for development if key is missing
    console.warn('⚠️ serviceAccountKey.json not found! Firestore writes will fail.');
    // In production, you might use Application Default Credentials
    // admin.initializeApp(); 
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
}

export const db = admin.apps.length > 0 ? admin.firestore() : null;
