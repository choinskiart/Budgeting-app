import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCICxqd_ioAe1lJ61E3MnI2Wfrt6XX0kVY",
  authDomain: "budgeting-app-3decf.firebaseapp.com",
  projectId: "budgeting-app-3decf",
  storageBucket: "budgeting-app-3decf.firebasestorage.app",
  messagingSenderId: "147661255003",
  appId: "1:147661255003:web:b5bc9888163b3c33cc2a7e",
  measurementId: "G-7QKCJ08Z8L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
