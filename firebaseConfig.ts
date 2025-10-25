import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';


// =================================================================================
// TODO: PASTE YOUR FIREBASE CONFIGURATION HERE
// = a. Go to your Firebase project console.
// b. In your Project settings, find your web app.
// c. Copy the firebaseConfig object and paste it here.
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDx7Wn7cPj4Gsz68rRARoRkhH1ANT9PvJE",
  authDomain: "vasooli-1-money.firebaseapp.com",
  projectId: "vasooli-1-money",
  storageBucket: "vasooli-1-money.firebasestorage.app",
  messagingSenderId: "699599498161",
  appId: "1:699599498161:web:aafae6fe8250fdeaff6b90",
  measurementId: "G-8G675RZ3RW"
};


// --- Do not change below this line ---

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();


export { auth, db, googleProvider };