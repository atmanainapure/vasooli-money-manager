import React, { useState } from 'react';
import { auth, googleProvider, db } from '../firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const LoginPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user exists in Firestore, if not, create a new document
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        await setDoc(userRef, {
          id: user.uid,
          name: user.displayName || 'Anonymous',
          email: user.email,
          avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
          monthlyLimit: 0,
        });
      }
    } catch (err: any) {
      console.error("Error signing in with Google: ", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError(
          'This domain is not authorized for authentication. Please add it to the list of authorized domains in your Firebase console under Authentication > Settings > Authorized domains.'
        );
      } else {
        setError('An unexpected error occurred during sign-in. Please try again.');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-center p-4">
      <div className="mb-8">
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-400">Vasooli</h1>
        <p className="text-slate-400 mt-2">Paise do warna Sooli pe chadha denge</p>
      </div>
      
      {error && (
        <div className="bg-rose-500/20 border border-rose-500 text-rose-300 px-4 py-3 rounded-md relative mb-6 max-w-md" role="alert">
          <strong className="font-bold">Login Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <button 
        onClick={handleGoogleSignIn}
        className="flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-slate-800 bg-white hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 focus:ring-offset-slate-900"
      >
        <svg className="w-5 h-5 mr-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
          <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
          <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
          <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
        </svg>
        Sign in with Google
      </button>
    </div>
  );
};

export default LoginPage;