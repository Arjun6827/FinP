import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyBhZt85LMygYvn59-x9skxofv8UP9k7Tpw",
  authDomain: "finpilot-c6bb4.firebaseapp.com",
  projectId: "finpilot-c6bb4",
  storageBucket: "finpilot-c6bb4.firebasestorage.app",
  messagingSenderId: "511343250245",
  appId: "1:511343250245:web:891886fb71648049b8cc2c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export { app, db, auth };
