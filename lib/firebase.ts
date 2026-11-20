import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
  type Auth,
  type User,
} from 'firebase/auth';

// Firebase project configuration, loaded from environment variables.
// Required keys: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
// NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
// NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, NEXT_PUBLIC_FIREBASE_APP_ID.
// The NEXT_PUBLIC_ prefix is required because this config is consumed in
// client components; Next.js only inlines env vars into the browser bundle
// when they carry that prefix.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function assertFirebaseConfig() {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) {
    throw new Error(`Missing Firebase env vars: ${missing.join(', ')}`);
  }
}

let cachedApp: FirebaseApp | undefined;
let cachedAuth: Auth | undefined;
let cachedGoogleProvider: GoogleAuthProvider | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!cachedApp) {
    assertFirebaseConfig();
    cachedApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return cachedApp;
}

export function getFirebaseAuth(): Auth {
  if (!cachedAuth) {
    cachedAuth = getAuth(getFirebaseApp());
    // Persist auth state across browser restarts, not just the current tab session.
    setPersistence(cachedAuth, browserLocalPersistence).catch(() => {
      /* non-fatal: falls back to the default persistence behavior */
    });
  }
  return cachedAuth;
}

function getGoogleProvider(): GoogleAuthProvider {
  if (!cachedGoogleProvider) {
    cachedGoogleProvider = new GoogleAuthProvider();
    cachedGoogleProvider.addScope('email');
    cachedGoogleProvider.addScope('profile');
  }
  return cachedGoogleProvider;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  message: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/popup-blocked': 'Popup blocked. Please allow popups for this site.',
  'auth/popup-closed-by-user': 'Sign in cancelled.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled.',
};

function getErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (typeof code === 'string' && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  // A thrown config error (from assertFirebaseConfig) has no Firebase code.
  const message = (err as { message?: string })?.message;
  if (typeof message === 'string' && message.startsWith('Missing Firebase env vars')) {
    return 'Authentication is not configured. Set the NEXT_PUBLIC_FIREBASE_* values in .env.local and restart the dev server.';
  }
  return 'An unexpected error occurred. Please try again.';
}

export async function signInWithEmailPassword(email: string, password: string): Promise<AuthResult> {
  try {
    const result = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    return { success: true, user: result.user, message: 'Signed in successfully!' };
  } catch (err) {
    return { success: false, message: getErrorMessage(err) };
  }
}

export async function createUserWithEmailPassword(
  email: string,
  password: string,
  username: string
): Promise<AuthResult> {
  try {
    const result = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    await updateProfile(result.user, { displayName: username });
    return { success: true, user: result.user, message: 'Account created successfully!' };
  } catch (err) {
    return { success: false, message: getErrorMessage(err) };
  }
}

export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const result = await signInWithPopup(getFirebaseAuth(), getGoogleProvider());
    return { success: true, user: result.user, message: 'Signed in with Google successfully!' };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/popup-closed-by-user') {
      return { success: false, message: 'Sign in cancelled' };
    }
    return { success: false, message: getErrorMessage(err) };
  }
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  try {
    await sendPasswordResetEmail(getFirebaseAuth(), email);
    return { success: true, message: 'Password reset email sent!' };
  } catch (err) {
    return { success: false, message: getErrorMessage(err) };
  }
}

export function watchAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export async function signOutUser(): Promise<AuthResult> {
  try {
    await firebaseSignOut(getFirebaseAuth());
    return { success: true, message: 'Signed out' };
  } catch (err) {
    return { success: false, message: (err as Error)?.message || 'Sign out failed' };
  }
}