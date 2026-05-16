import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Replace these with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBhZt85LMygYvn59-x9skxofv8UP9k7Tpw",
  authDomain: "finpilot-c6bb4.firebaseapp.com",
  projectId: "finpilot-c6bb4",
  storageBucket: "finpilot-c6bb4.firebasestorage.app",
  messagingSenderId: "511343250245",
  appId: "1:511343250245:web:891886fb71648049b8cc2c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a a time.
    console.warn("Firebase persistence failed: Multiple tabs open");
  } else if (err.code === 'unimplemented') {
    // The current browser does not support all of the features required to enable persistence
    console.warn("Firebase persistence not supported by this browser");
  }
});

export { app, db, auth };
